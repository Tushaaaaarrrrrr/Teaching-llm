import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { validateLength, sanitizeInput } from '@/lib/validation'
import { sseEmitter } from '@/lib/sse'
import { sendCommunityNotification, sendDMNotification } from '@/lib/community-notifications'

// ─── DM helpers ─────────────────────────────────────────────────────────────

function isDM(courseId: string) { return courseId.startsWith('dm_') }
function chatId(courseId: string) { return courseId.slice(3) }

async function getDMSession(chatId: string, userId: string, role: string) {
  const chat = await prisma.chatSession.findUnique({
    where: { id: chatId },
    include: {
      student: { select: { id: true, name: true, role: true } },
      agent: { select: { id: true, name: true, role: true } },
    },
  })
  if (!chat) return null
  // Only the student OR the specific agent (manager) who owns this DM can access it
  if (chat.studentId !== userId && chat.agentId !== userId) return null
  return chat
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Direct Message path ──────────────────────────────────────────────────
    if (isDM(courseId)) {
      const id = chatId(courseId)
      const chat = await getDMSession(id, session.userId, session.role)
      if (!chat) return NextResponse.json({ error: 'Chat not found or forbidden' }, { status: 404 })

      const rawMessages = await prisma.chatMessage.findMany({
        where: { chatId: id },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          replyTo: {
            include: {
              sender: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'asc' },
      })

      const messages = rawMessages.map(m => ({
        id: m.id,
        content: m.isDeleted ? '' : m.content,
        imageUrl: m.isDeleted ? null : m.imageUrl,
        createdAt: m.createdAt,
        isDeleted: m.isDeleted,
        sender: {
          id: m.sender.id,
          name: m.sender.name,
          role: m.sender.role,
          securityNumber: undefined,
        },
        replyTo: m.replyTo ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          imageUrl: m.replyTo.imageUrl,
          sender: {
            id: m.replyTo.sender.id,
            name: m.replyTo.sender.name
          }
        } : undefined,
      }))
      return NextResponse.json(messages)
    }

    // ── Community path ───────────────────────────────────────────────────────
    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { isCommunityActive: true },
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (!course.isCommunityActive && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'This community is currently disabled' }, { status: 403 })
    }

    const { searchParams } = new URL(_request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')

    const messages = await prisma.communityMessage.findMany({
      where: { courseId },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sender: { select: { id: true, name: true, role: true, securityNumber: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    messages.reverse()

    const sanitized = messages.map(msg => {
      const isActuallyDeleted = msg.isDeleted || msg.isSystemDeleted
      return {
        ...msg,
        content: (isActuallyDeleted && session.role !== 'MANAGER') ? '' : msg.content,
        sender: {
          ...msg.sender,
          securityNumber: session.role === 'MANAGER' ? msg.sender.securityNumber : undefined,
        },
      }
    })
    return NextResponse.json(sanitized)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content, imageUrl, replyToId } = await request.json()
    if ((!content || !content.trim()) && !imageUrl) {
      return NextResponse.json({ error: 'Message must have content or an image' }, { status: 400 })
    }
    if (content && !validateLength(content, 2000)) {
      return NextResponse.json({ error: 'Message content must be between 1 and 2,000 characters' }, { status: 400 })
    }
    const sanitizedContent = content ? sanitizeInput(content) : ''

    // ── Direct Message path ──────────────────────────────────────────────────
    if (isDM(params.courseId)) {
      const id = chatId(params.courseId)
      const chat = await getDMSession(id, session.userId, session.role)
      if (!chat) return NextResponse.json({ error: 'Chat not found or forbidden' }, { status: 404 })

      // Both sides can send messages in a DIRECT chat

      const msg = await prisma.chatMessage.create({
        data: { 
          chatId: id, 
          senderId: session.userId, 
          content: sanitizedContent, 
          imageUrl: imageUrl || null,
          replyToId: replyToId || null
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          replyTo: {
            include: {
              sender: { select: { id: true, name: true } }
            }
          }
        },
      })

      // Bump chat updatedAt for sorting
      await prisma.chatSession.update({
        where: { id },
        data: { updatedAt: new Date() },
      })

      logActivity({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        actionType: ACTION.MESSAGE_SENT,
        actionDescription: `${session.name} sent a direct message`,
        moduleName: MODULE.COMMUNITY,
        targetId: msg.id,
      })

      // Emit SSE to both DM channel participants
      const event = { 
        id: msg.id, 
        content: msg.content, 
        imageUrl: msg.imageUrl, 
        createdAt: msg.createdAt, 
        isDeleted: false, 
        sender: { id: msg.sender.id, name: msg.sender.name, role: msg.sender.role },
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          content: msg.replyTo.content,
          imageUrl: msg.replyTo.imageUrl,
          sender: {
            id: msg.replyTo.sender.id,
            name: msg.replyTo.sender.name
          }
        } : undefined
      }
      sseEmitter.emit(`chat:dm_${id}:message`, event)

      // Notify the OTHER participant in the DM (non-blocking)
      const recipientId = chat.studentId === session.userId ? chat.agentId : chat.studentId
      sendDMNotification(id, { userId: session.userId, name: session.name }, recipientId, {
        content: msg.content,
        imageUrl: msg.imageUrl,
      }).catch(console.error)

      return NextResponse.json(event, { status: 201 })
    }

    // ── Community path ───────────────────────────────────────────────────────
    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(params.courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { isCommunityActive: true },
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (!course.isCommunityActive && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'This community is currently disabled' }, { status: 403 })
    }

    const message = await prisma.communityMessage.create({
      data: { 
        courseId: params.courseId, 
        senderId: session.userId, 
        content: sanitizedContent, 
        imageUrl: imageUrl || null,
        replyToId: replyToId || null
      },
      include: {
        sender: { select: { id: true, name: true, role: true, securityNumber: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true } }
          }
        }
      },
    })

    await prisma.course.update({
      where: { id: params.courseId },
      data: { lastMessageAt: message.createdAt },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MESSAGE_SENT,
      actionDescription: `${session.name} sent a message in community chat`,
      moduleName: MODULE.COMMUNITY,
      targetId: message.id,
    })

    sseEmitter.emit(`chat:${params.courseId}:message`, message)

    // Notify all enrolled, unmuted users (non-blocking)
    sendCommunityNotification(params.courseId, {
      userId: session.userId,
      name: session.name,
      role: session.role,
    }, {
      content: message.content,
      imageUrl: message.imageUrl,
    }).catch(console.error)

    return NextResponse.json({
      ...message,
      sender: {
        ...message.sender,
        securityNumber: session.role === 'MANAGER' ? message.sender.securityNumber : undefined,
      },
    }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messageId } = await request.json()
    if (!messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 })

    // ── Direct Message path ──────────────────────────────────────────────────
    if (isDM(params.courseId)) {
      const id = chatId(params.courseId)
      // Only managers can delete DM messages
      if (session.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Only managers can delete messages in direct chats' }, { status: 403 })
      }

      const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } })
      if (!msg || msg.chatId !== id) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isDeleted: true, deletedAt: new Date(), content: '[Deleted by manager]' },
      })

      logActivity({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        actionType: ACTION.MESSAGE_DELETED,
        actionDescription: `${session.name} deleted a direct message`,
        moduleName: MODULE.COMMUNITY,
        targetId: messageId,
      })

      sseEmitter.emit(`chat:dm_${id}:delete`, messageId)
      return NextResponse.json({ success: true })
    }

    // ── Community path ───────────────────────────────────────────────────────
    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(params.courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { isCommunityActive: true },
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (!course.isCommunityActive && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'This community is currently disabled' }, { status: 403 })
    }

    const message = await prisma.communityMessage.findUnique({ where: { id: messageId } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    if (message.courseId !== params.courseId) {
      return NextResponse.json({ error: 'Message does not belong to this course' }, { status: 400 })
    }
    if (session.role !== 'MANAGER' && message.senderId !== session.userId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 })
    }
    if (message.isDeleted) return NextResponse.json({ error: 'Message already deleted' }, { status: 400 })

    await prisma.communityMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: session.role === 'MANAGER' ? '[Message deleted by manager]' : '[Message deleted by user]',
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MESSAGE_DELETED,
      actionDescription: `${session.name} deleted a message in community chat`,
      moduleName: MODULE.COMMUNITY,
      targetId: messageId,
    })

    sseEmitter.emit(`chat:${params.courseId}:delete`, messageId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

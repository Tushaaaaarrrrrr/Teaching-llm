import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sseEmitter } from '@/lib/sse'
import { logActivity, MODULE } from '@/lib/activity-log'

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; messageId: string } }
) {
  try {
    const { courseId, messageId } = params
    if (!courseId || !messageId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers can pin/unpin messages
    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Only managers can pin or unpin messages' }, { status: 403 })
    }

    const { action } = await request.json().catch(() => ({}))
    if (action !== 'pin' && action !== 'unpin') {
      return NextResponse.json({ error: 'Invalid action. Must be pin or unpin' }, { status: 400 })
    }

    // Direct Messages do not support pinned messages
    if (courseId.startsWith('dm_')) {
      return NextResponse.json({ error: 'Pinned messages are not supported in direct chats' }, { status: 400 })
    }

    const message = await prisma.communityMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.courseId !== courseId) {
      return NextResponse.json({ error: 'Message does not belong to this community' }, { status: 400 })
    }

    if (message.isDeleted || message.isSystemDeleted) {
      return NextResponse.json({ error: 'Cannot pin a deleted message' }, { status: 400 })
    }

    if (action === 'pin') {
      // Unpin all other messages in this course, then pin the targeted message
      await prisma.$transaction([
        prisma.communityMessage.updateMany({
          where: { courseId, isPinned: true },
          data: { isPinned: false },
        }),
        prisma.communityMessage.update({
          where: { id: messageId },
          data: { isPinned: true },
        }),
      ])

      logActivity({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        actionType: 'MESSAGE_PINNED',
        actionDescription: `${session.name} pinned a message in community chat`,
        moduleName: MODULE.COMMUNITY,
        targetId: messageId,
      })

      // Emit real-time SSE pin event
      sseEmitter.emit(`chat:${courseId}:pin`, { messageId })
    } else {
      // Unpin the targeted message
      await prisma.communityMessage.update({
        where: { id: messageId },
        data: { isPinned: false },
      })

      logActivity({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        actionType: 'MESSAGE_UNPINNED',
        actionDescription: `${session.name} unpinned a message in community chat`,
        moduleName: MODULE.COMMUNITY,
        targetId: messageId,
      })

      // Emit real-time SSE pin event (null indicates no pinned message)
      sseEmitter.emit(`chat:${courseId}:pin`, { messageId: null })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

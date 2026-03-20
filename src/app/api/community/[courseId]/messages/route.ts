import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { validateLength, sanitizeInput } from '@/lib/validation'
import { triggerAlert } from '@/lib/alerts'

export async function GET(
  _request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role);
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { isCommunityActive: true }
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    // If community is disabled and user is a student, deny access
    if (!course.isCommunityActive && session.role === 'STUDENT') {
      return NextResponse.json({ 
        error: 'Community is temporarily disabled by managers',
        isCommunityActive: false 
      }, { status: 403 });
    }

    const { searchParams } = new URL(_request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20');

    const messages = await prisma.communityMessage.findMany({
      where: { courseId },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            securityNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Reverse to return in chronological order for the chat UI
    messages.reverse()

    // For non-managers: hide deleted message content and strip securityNumber
    // For managers: show original content but with flags
    const sanitized = messages.map(msg => {
      const isActuallyDeleted = msg.isDeleted || msg.isSystemDeleted
      let displayContent = msg.content
      
      if (isActuallyDeleted && session.role === 'STUDENT') {
        displayContent = 'This message was removed by a manager'
      }

      return {
        ...msg,
        content: displayContent,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(params.courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { content } = await request.json()
    
    if (!content || !validateLength(content, 500)) {
      return NextResponse.json({ error: 'Message content must be between 1 and 500 characters' }, { status: 400 })
    }

    // Safety check: check payload size (approximate)
    if (JSON.stringify(content).length > 1000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const sanitizedContent = sanitizeInput(content)

    // Anti-Spam Optimization: Fetch user with blocking details
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { 
        id: true, name: true, role: true, 
        violationCount: true, blockedUntil: true, lastViolationAt: true 
      }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // 1. Early Check: Blocking System
    if (user.blockedUntil && user.blockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.blockedUntil.getTime() - Date.now()) / 60000)
      return NextResponse.json({ 
        error: `You are blocked for ${remainingMinutes} minutes`,
        isBlocked: true,
        remainingMinutes 
      }, { status: 403 })
    }

    // 2. Cooldown Logic: Reset violationCount after 24h
    let currentViolationCount = user.violationCount
    const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours
    if (user.lastViolationAt && (Date.now() - user.lastViolationAt.getTime() > COOLDOWN_MS)) {
      currentViolationCount = 0
    }

    // 3. Repeated Message Detection (Optimized: only fetch last 3)
    const recentMessages = await prisma.communityMessage.findMany({
      where: { senderId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { content: true }
    })

    const isDuplicate = recentMessages.length === 3 && recentMessages.every(m => m.content === sanitizedContent)

    if (isDuplicate) {
      const newViolationCount = currentViolationCount + 1
      let blockDuration = 0 // minutes
      let errorMessage = 'Please do not repeat the same message'

      if (newViolationCount === 2) {
        blockDuration = 10
      } else if (newViolationCount >= 3) {
        blockDuration = 30
      }

      const blockedUntil = blockDuration > 0 ? new Date(Date.now() + blockDuration * 60000) : null

      await prisma.user.update({
        where: { id: session.userId },
        data: {
          violationCount: newViolationCount,
          lastViolationAt: new Date(),
          blockedUntil: blockedUntil
        }
      })

      if (blockDuration > 0) {
        errorMessage = `System detect repeated messages. You are blocked for ${blockDuration} minutes.`
        
        // Trigger Security Alert
        triggerAlert({
          userId: session.userId,
          userName: session.name,
          userRole: session.role,
          actionType: 'ANTI_SPAM_BLOCK',
          description: `${session.name} was blocked for ${blockDuration}m due to repeated messages`,
          moduleName: MODULE.COMMUNITY,
          level: 'MEDIUM',
          metadata: { violationCount: newViolationCount, courseId: params.courseId }
        })
      }

      return NextResponse.json({ 
        error: errorMessage,
        isBlocked: blockDuration > 0,
        remainingMinutes: blockDuration
      }, { status: 403 })
    }

    const message = await prisma.communityMessage.create({
      data: { courseId: params.courseId, senderId: session.userId, content: sanitizedContent },
      include: {
        sender: { select: { id: true, name: true, role: true, securityNumber: true } },
      },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(params.courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { messageId } = await request.json()
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }

    // Find the message and verify ownership
    const message = await prisma.communityMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.courseId !== params.courseId) {
      return NextResponse.json({ error: 'Message does not belong to this course' }, { status: 400 })
    }

    // Only the sender can delete their own message, unless session is Manager/Admin
    const isManager = session.role === 'MANAGER' || session.role === 'ADMIN'
    if (message.senderId !== session.userId && !isManager) {
      return NextResponse.json({ error: 'You do not have permission to delete this message' }, { status: 403 })
    }

    if (message.isDeleted || message.isSystemDeleted) {
      return NextResponse.json({ error: 'Message already deleted' }, { status: 400 })
    }

    // Soft delete: set flags
    const isSystemDeleted = isManager && message.senderId !== session.userId
    await prisma.communityMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: !isSystemDeleted,
        isSystemDeleted,
        deletedAt: new Date(),
        // content is PRESERVED in DB but hidden via GET logic
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MESSAGE_DELETED,
      actionDescription: `${session.name} ${isSystemDeleted ? 'moderated (deleted)' : 'deleted'} a message in community chat`,
      moduleName: MODULE.COMMUNITY,
      targetId: messageId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

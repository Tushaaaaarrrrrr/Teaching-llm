import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { validateLength, sanitizeInput } from '@/lib/validation'

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
      select: { isCommunityActive: true },
    })
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    if (!course.isCommunityActive && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'This community is currently disabled' }, { status: 403 })
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
    // For managers: show content but with flags
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

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { isCommunityActive: true },
    })
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    if (!course.isCommunityActive && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'This community is currently disabled' }, { status: 403 })
    }

    const { content } = await request.json()
    
    if (!content || !validateLength(content, 2000)) {
      return NextResponse.json({ error: 'Message content must be between 1 and 2,000 characters' }, { status: 400 })
    }

    const sanitizedContent = sanitizeInput(content)

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

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { isCommunityActive: true },
    })
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    if (!course.isCommunityActive && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'This community is currently disabled' }, { status: 403 })
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

    // Managers can moderate any message. Others can delete only their own.
    if (session.role !== 'MANAGER' && message.senderId !== session.userId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 })
    }

    if (message.isDeleted) {
      return NextResponse.json({ error: 'Message already deleted' }, { status: 400 })
    }

    // Soft delete: mark as deleted
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { validateLength, sanitizeInput } from '@/lib/validation'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    // MANAGER sees all announcements; others see global + their enrolled course announcements
    const where = accessibleCourseIds === null
      ? {}
      : {
          OR: [
            { courseId: null },
            { courseId: { in: accessibleCourseIds } },
          ],
        }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatar: true } },
        course: { select: { id: true, name: true, color: true } },
        poll: {
          include: {
            options: { orderBy: { order: 'asc' } },
            responses: { where: { userId: session.userId }, select: { optionId: true } },
          },
        },
      },
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, content, type, courseId, imageUrl, pollData } = await request.json()

    // Mutual exclusivity check
    if (imageUrl && pollData) {
      return NextResponse.json({ error: 'An announcement cannot have both an image and a poll' }, { status: 400 })
    }

    if (!title || !validateLength(title, 200)) {
      return NextResponse.json({ error: 'Announcement title must be between 1 and 200 characters' }, { status: 400 })
    }

    if (!content || !validateLength(content, 10000)) {
      return NextResponse.json({ error: 'Announcement content must be between 1 and 10,000 characters' }, { status: 400 })
    }

    const sanitizedTitle = sanitizeInput(title)
    const sanitizedContent = sanitizeInput(content)

    // Handle nested poll creation if provided
    let createdPollId: string | null = null
    if (pollData) {
      const poll = await prisma.poll.create({
        data: {
          question: pollData.question,
          expiresAt: new Date(pollData.expiresAt),
          createdById: session.userId,
          options: {
            create: pollData.options.map((opt: string, idx: number) => ({
              text: opt,
              order: idx,
            })),
          },
        },
      })
      createdPollId = poll.id
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: sanitizedTitle,
        content: sanitizedContent,
        type: type || 'info',
        courseId: courseId || null,
        imageUrl: imageUrl || null,
        pollId: createdPollId,
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatar: true } },
        course: { select: { id: true, name: true, color: true } },
        poll: { include: { options: true } },
      },
    })

    // Fan-out notifications: if courseId is provided, notify only enrolled students;
    // otherwise notify all users
    let targetUsers: { id: string }[]

    if (courseId) {
      // Notify only STUDENT-role users enrolled in the specified course
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId, user: { role: 'STUDENT' } },
        select: { userId: true },
      })
      targetUsers = enrollments.map(e => ({ id: e.userId }))
    } else {
      // Global announcement - notify all students
      targetUsers = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true },
      })
    }

    if (targetUsers.length > 0) {
      const truncatedContent = content.length > 100
        ? content.slice(0, 97) + '...'
        : content

      await prisma.notification.createMany({
        data: targetUsers.map(u => ({
          userId: u.id,
          title: `New Announcement: ${title}`,
          content: truncatedContent,
          type: type?.toUpperCase() || 'INFO',
          announcementId: announcement.id,
        })),
      })
    }

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.ANNOUNCEMENT_CREATED,
      actionDescription: `${session.name} created announcement "${title}"`,
      moduleName: MODULE.ANNOUNCEMENTS,
      targetId: announcement.id,
    })

    if (pollData && createdPollId) {
      logActivity({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        actionType: ACTION.POLL_CREATED,
        actionDescription: `${session.name} created poll "${pollData.question}"`,
        moduleName: MODULE.ANNOUNCEMENTS,
        targetId: createdPollId,
      })
    }

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

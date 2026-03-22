import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkRateLimit } from '@/lib/ratelimit'
import { sanitizeInput } from '@/lib/validation'

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

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, content, type, courseId } = await request.json()

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(session.userId, 'general')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'You are doing this too fast, please wait.' }, 
        { status: 429 }
      )
    }

    // 2. Basic Validation
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title is too long (max 200 chars)' }, { status: 400 })
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content is too long (max 5000 chars)' }, { status: 400 })
    }

    const sanitizedTitle = sanitizeInput(title)
    const sanitizedContent = sanitizeInput(content)

    const announcement = await prisma.announcement.create({
      data: {
        title: sanitizedTitle,
        content: sanitizedContent,
        type: type || 'info',
        courseId: courseId || null,
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatar: true } },
        course: { select: { id: true, name: true, color: true } },
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
      const truncatedContent = sanitizedContent.length > 100
        ? sanitizedContent.slice(0, 97) + '...'
        : sanitizedContent

      await prisma.notification.createMany({
        data: targetUsers.map(u => ({
          userId: u.id,
          title: `New Announcement: ${sanitizedTitle}`,
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
      actionDescription: `${session.name} created announcement "${sanitizedTitle}"`,
      moduleName: MODULE.ANNOUNCEMENTS,
      targetId: announcement.id,
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

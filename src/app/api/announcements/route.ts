import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds, canCreateAnnouncements } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { sseEmitter } from '@/lib/sse'
import { sendPushToUsers, sendPushToAllStudents } from '@/lib/push'
import { sendFcmToUsers, sendFcmToAllStudents } from '@/lib/fcm'

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

    if (!canCreateAnnouncements(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, content, type, courseId } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
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

      // Notify connected clients via SSE
      targetUsers.forEach(u => sseEmitter.emit(`user:${u.id}:notify`))

      // Fire browser push notifications (works even when browser tab is closed)
      const targetUserIds = targetUsers.map(u => u.id)
      const pushBody = content.length > 120 ? content.slice(0, 117) + '...' : content
      const pushPayload = {
        title,
        body: pushBody,
        url: '/announcements',
        tag: `announcement-${announcement.id}`,
      }
      if (courseId) {
        sendPushToUsers(targetUserIds, pushPayload).catch(console.error)
        sendFcmToUsers(targetUserIds, pushPayload).catch(console.error)
      } else {
        sendPushToAllStudents(pushPayload).catch(console.error)
        sendFcmToAllStudents(pushPayload).catch(console.error)
      }
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

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

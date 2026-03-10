import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleClassIds } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)

    // MANAGER sees all announcements; others see global + their enrolled class announcements
    const where = accessibleClassIds === null
      ? {}
      : {
          OR: [
            { classId: null },
            { classId: { in: accessibleClassIds } },
          ],
        }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatar: true } },
        class: { select: { id: true, name: true, color: true } },
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

    const { title, content, type, classId } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        classId: classId || null,
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatar: true } },
        class: { select: { id: true, name: true, color: true } },
      },
    })

    // Fan-out notifications: if classId is provided, notify only enrolled students;
    // otherwise notify all users
    let targetUsers: { id: string }[]

    if (classId) {
      // Notify only STUDENT-role users enrolled in the specified class
      const enrollments = await prisma.enrollment.findMany({
        where: { classId, user: { role: 'STUDENT' } },
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

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleClassIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}
    if (status) where.status = status

    const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)
    if (accessibleClassIds !== null) {
      where.classId = { in: accessibleClassIds }
    }

    const liveSessions = await prisma.liveSession.findMany({
      where,
      include: {
        class: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(liveSessions)
  } catch (error) {
    console.error('Error fetching live sessions:', error)
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

    const { classId, title, description, meetingLink, instructor, date, time, status } =
      await request.json()

    // Verify ADMIN has access to the target class
    if (session.role === 'ADMIN') {
      const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)
      if (accessibleClassIds !== null && !accessibleClassIds.includes(classId)) {
        return NextResponse.json({ error: 'No access to this class' }, { status: 403 })
      }
    }

    // Get the class name for linking to the calendar event
    let className: string | null = null
    if (classId) {
      const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } })
      className = cls?.name || null
    }

    const liveSession = await prisma.liveSession.create({
      data: {
        classId,
        title,
        description,
        meetingLink,
        instructor,
        date,
        time,
        status,
        createdById: session.userId,
      },
    })

    // Auto-create a calendar event linked to the same class
    if (date) {
      await prisma.calendarEvent.create({
        data: {
          title: `Live: ${title}`,
          description: instructor ? `Instructor: ${instructor}` : description || null,
          date,
          time: time || null,
          type: 'class',
          classId: classId || null,
          relatedClass: className,
          createdById: session.userId,
        },
      })
    }

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.SESSION_CREATED,
      actionDescription: `${session.name} created live session "${title}"`,
      moduleName: MODULE.LIVE_SESSIONS,
      targetId: liveSession.id,
    })

    return NextResponse.json(liveSession, { status: 201 })
  } catch (error) {
    console.error('Error creating live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

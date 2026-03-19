import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

// Compute status dynamically from time
function computeStatus(event: { startTime: Date; endTime: Date; manualStatus: string }) {
  if (event.manualStatus === 'CANCELLED') return 'cancelled'
  if (event.manualStatus === 'RESCHEDULED') return 'rescheduled'
  const now = new Date()
  if (now < event.startTime) return 'upcoming'
  if (now >= event.startTime && now <= event.endTime) return 'live'
  return 'completed'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const type = searchParams.get('type')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    // Filter by month (YYYY-MM)
    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59, 999)
      where.startTime = { gte: start, lte: end }
    }

    if (type) where.type = type

    // Role-based course filtering
    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null) {
      where.OR = [
        { courseId: null },   // GLOBAL events visible to everyone
        { courseId: { in: accessibleCourseIds } },
      ]
    }

    // Get user enrollments for meetLink security
    const userEnrollments = session.role === 'STUDENT'
      ? await prisma.enrollment.findMany({
          where: { userId: session.userId },
          select: { courseId: true },
        })
      : null
    const enrolledCourseIds = userEnrollments?.map(e => e.courseId) || []

    const events = await prisma.courseEvent.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, color: true } },
        instructor: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    })

    // Map events with computed status and meetLink security
    const mapped = events.map(ev => {
      const status = computeStatus(ev)
      const isGlobal = !ev.courseId
      const isEnrolled = isGlobal || enrolledCourseIds.includes(ev.courseId || '')
      const canSeeMeetLink = isAdminOrManager(session.role) || isEnrolled

      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        startTime: ev.startTime.toISOString(),
        endTime: ev.endTime.toISOString(),
        meetLink: canSeeMeetLink ? ev.meetLink : null,
        type: ev.type,
        manualStatus: ev.manualStatus,
        status,
        courseId: ev.courseId,
        course: ev.course,
        instructorId: ev.instructorId,
        instructor: ev.instructor,
        googleEventId: ev.googleEventId,
        createdAt: ev.createdAt.toISOString(),
      }
    })

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching course events:', error)
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

    const body = await request.json()
    const { title, description, startTime, endTime, meetLink, type, courseId, instructorId, manualStatus } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Title, startTime, and endTime are required' }, { status: 400 })
    }

    // Verify ADMIN has access to the target course
    if (session.role === 'ADMIN' && courseId) {
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
        return NextResponse.json({ error: 'No access to this course' }, { status: 403 })
      }
    }

    const event = await prisma.courseEvent.create({
      data: {
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetLink: meetLink || null,
        type: type || 'class',
        courseId: courseId || null,
        instructorId: instructorId || null,
        manualStatus: manualStatus || 'NONE',
        createdById: session.userId,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EVENT_CREATED,
      actionDescription: `${session.name} created course event "${title}"`,
      moduleName: MODULE.CALENDAR,
      targetId: event.id,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating course event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

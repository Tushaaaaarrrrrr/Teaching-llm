import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { formatIST, getEventStatus } from '@/lib/date-utils'

// Compute status dynamically from time
// Status calculation now handled by getEventStatus in @/lib/date-utils

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
        course: { select: { id: true, name: true, color: true, teacherName: true } },
        instructor: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    })

    // Map events with computed status and meetLink security
    const mapped = events.map(ev => {
      const status = getEventStatus(ev.startTime, ev.endTime, ev.status)
      const isGlobal = ev.isGlobal || !ev.courseId
      const isEnrolled = isGlobal || enrolledCourseIds.includes(ev.courseId || '')
      const canSeeMeetLink = isAdminOrManager(session.role) || session.role === 'INSTRUCTOR' || isEnrolled

      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        startTime: ev.startTime.toISOString(),
        endTime: ev.endTime.toISOString(),
        date: ev.startTime.toISOString().split('T')[0],
        time: formatIST(ev.startTime, { hour: '2-digit', minute: '2-digit', hour12: false }),
        meetLink: canSeeMeetLink ? ev.meetLink : null,
        meetingLink: canSeeMeetLink ? ev.meetLink : null, // alias
        type: ev.type,
        status,
        internalStatus: ev.status, // SCHEDULED, CANCELLED, RESCHEDULED
        courseId: ev.courseId,
        course: ev.course,
        instructorId: ev.instructorId,
        instructor: ev.instructor,
        isGlobal: ev.isGlobal,
        recurrence: ev.recurrence,
        originalStartTime: ev.originalStartTime ? ev.originalStartTime.toISOString() : null,
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

    if (!isAdminOrManager(session.role) && session.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      title, description, startTime, endTime, meetLink, 
      type, courseId, instructorId, status, isGlobal,
      recurrence, interval
    } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Title, startTime, and endTime are required' }, { status: 400 })
    }

    // Verify ADMIN/INSTRUCTOR has access to the target course
    if ((session.role === 'ADMIN' || session.role === 'INSTRUCTOR') && courseId) {
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
        courseId: isGlobal ? null : (courseId || null),
        isGlobal: !!isGlobal,
        instructorId: instructorId || null,
        status: status || 'SCHEDULED',
        recurrence: recurrence || 'ONETIME',
        interval: interval ? parseInt(interval) : null,
        createdById: session.userId,
      },
    })

    // Handle Recurrence Generation (Simple approach)
    if (recurrence && recurrence !== 'ONETIME') {
      const occurrences = []
      const start = new Date(startTime)
      const end = new Date(endTime)
      const duration = end.getTime() - start.getTime()
      
      const maxCount = 20 // Generate up to 20 future occurrences
      for (let i = 1; i <= maxCount; i++) {
        let nextStart = new Date(start)
        if (recurrence === 'DAILY') {
          nextStart.setDate(start.getDate() + i)
        } else if (recurrence === 'WEEKLY') {
          nextStart.setDate(start.getDate() + i * 7)
        } else if (recurrence === 'CUSTOM') {
          nextStart.setDate(start.getDate() + i * (interval || 1))
        } else {
          break
        }

        occurrences.push({
          title,
          description: description || null,
          startTime: nextStart,
          endTime: new Date(nextStart.getTime() + duration),
          meetLink: meetLink || null,
          type: type || 'class',
          courseId: isGlobal ? null : (courseId || null),
          isGlobal: !!isGlobal,
          instructorId: instructorId || null,
          status: 'SCHEDULED',
          recurrence: 'ONETIME',
          parentId: event.id,
          createdById: session.userId,
        })
      }

      if (occurrences.length > 0) {
        await prisma.courseEvent.createMany({ data: occurrences })
      }
    }

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EVENT_CREATED,
      actionDescription: `${session.name} created internal event "${title}"`,
      moduleName: MODULE.CALENDAR,
      targetId: event.id,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating course event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

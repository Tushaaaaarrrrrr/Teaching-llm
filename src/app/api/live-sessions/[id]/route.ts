import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const event = await (prisma.calendarEvent as any).findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, color: true } },
        instructor: { select: { id: true, name: true } },
      },
    })

    if (!event || event.type !== 'live') {
      return NextResponse.json({ error: 'Live session not found' }, { status: 404 })
    }

    // Map to expected format
    return NextResponse.json({
      id: event.id,
      title: event.title,
      description: event.description,
      instructor: event.instructor?.name || 'Teacher',
      instructorId: event.instructorId,
      date: event.date,
      time: event.time,
      status: event.status,
      meetingLink: event.meetingLink,
      courseId: event.courseId,
      course: event.course ? { name: event.course.name, color: event.course.color } : { name: 'General', color: '#6366f1' }
    })
  } catch (error) {
    console.error('Error fetching live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { courseId, title, description, meetingLink, instructorId, instructor, date, time, status } =
      await request.json()

    // Verify access for ADMIN
    if (session.role === 'ADMIN' && courseId) {
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
        return NextResponse.json({ error: 'No access to this course' }, { status: 403 })
      }
    }

    const updatedEvent = await (prisma.calendarEvent as any).update({
      where: { id },
      data: {
        courseId: courseId || null,
        title,
        description,
        meetingLink,
        instructorId: instructorId || null,
        date,
        time,
        status,
      },
      include: {
        course: { select: { name: true, color: true } },
        instructor: { select: { name: true } }
      }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.SESSION_UPDATED,
      actionDescription: `${session.name} updated live session "${updatedEvent.title}"`,
      moduleName: MODULE.LIVE_SESSIONS,
      targetId: id,
    })

    return NextResponse.json({
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      instructor: updatedEvent.instructor?.name || instructor || 'Teacher',
      date: updatedEvent.date,
      time: updatedEvent.time,
      status: updatedEvent.status,
      meetingLink: updatedEvent.meetingLink,
      course: updatedEvent.course ? { name: updatedEvent.course.name, color: updatedEvent.course.color } : { name: 'General', color: '#6366f1' }
    })
  } catch (error) {
    console.error('Error updating live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existingEvent = await (prisma.calendarEvent as any).findUnique({
      where: { id },
      select: { title: true, type: true },
    })

    if (!existingEvent || existingEvent.type !== 'live') {
      return NextResponse.json({ error: 'Live session not found' }, { status: 404 })
    }

    await (prisma.calendarEvent as any).delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.SESSION_DELETED,
      actionDescription: `${session.name} deleted live session "${existingEvent.title}"`,
      moduleName: MODULE.LIVE_SESSIONS,
      targetId: id,
    })

    return NextResponse.json({ message: 'Live session deleted successfully' })
  } catch (error) {
    console.error('Error deleting live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

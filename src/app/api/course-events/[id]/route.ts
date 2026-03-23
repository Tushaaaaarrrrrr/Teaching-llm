import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
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

    const event = await prisma.courseEvent.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, color: true, teacherName: true } },
        instructor: { select: { id: true, name: true } },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching course event:', error)
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
    const body = await request.json()
    const { title, description, startTime, endTime, meetLink, type, courseId, instructorId, manualStatus } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description || null
    if (startTime !== undefined) data.startTime = new Date(startTime)
    if (endTime !== undefined) data.endTime = new Date(endTime)
    if (meetLink !== undefined) data.meetLink = meetLink || null
    if (type !== undefined) data.type = type
    if (courseId !== undefined) data.courseId = courseId || null
    if (instructorId !== undefined) data.instructorId = instructorId || null
    if (manualStatus !== undefined) data.manualStatus = manualStatus

    const updatedEvent = await prisma.courseEvent.update({
      where: { id },
      data,
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EVENT_UPDATED,
      actionDescription: `${session.name} updated course event "${updatedEvent.title}"`,
      moduleName: MODULE.CALENDAR,
      targetId: id,
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Error updating course event:', error)
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

    const existingEvent = await prisma.courseEvent.findUnique({
      where: { id },
      select: { title: true },
    })

    await prisma.courseEvent.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EVENT_DELETED,
      actionDescription: `${session.name} deleted course event "${existingEvent?.title ?? ''}"`,
      moduleName: MODULE.CALENDAR,
      targetId: id,
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting course event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

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
    const { title, description, date, time, type, relatedClass, classId, instructorId } =
      await request.json()

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: { title, description, date, time, type, relatedClass, classId, instructorId: instructorId !== undefined ? (instructorId || null) : undefined },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EVENT_UPDATED,
      actionDescription: `${session.name} updated calendar event "${updatedEvent.title}"`,
      moduleName: MODULE.CALENDAR,
      targetId: id,
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Error updating event:', error)
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

    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
      select: { title: true },
    })

    await prisma.calendarEvent.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EVENT_DELETED,
      actionDescription: `${session.name} deleted calendar event "${existingEvent?.title ?? ''}"`,
      moduleName: MODULE.CALENDAR,
      targetId: id,
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { events } = await request.json()

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid format. Expected an array of events.' }, { status: 400 })
    }

    const validEvents = []
    const errors = []

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]
      if (!ev.title || !ev.startTime || !ev.endTime) {
        errors.push(`Row ${i + 1}: Missing title, startTime, or endTime`)
        continue
      }

      validEvents.push({
        title: ev.title,
        description: ev.description || null,
        startTime: new Date(ev.startTime),
        endTime: new Date(ev.endTime),
        meetLink: ev.meetLink || null,
        type: ev.type || 'class',
        courseId: ev.isGlobal ? null : (ev.courseId || null),
        isGlobal: !!ev.isGlobal,
        instructorId: ev.instructorId || null,
        status: ev.status || 'SCHEDULED',
        createdById: session.userId,
      })
    }

    if (errors.length > 0 && validEvents.length === 0) {
      return NextResponse.json({ error: 'No valid events found', details: errors }, { status: 400 })
    }

    const created = await prisma.courseEvent.createMany({
      data: validEvents
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EVENT_CREATED,
      actionDescription: `${session.name} imported ${created.count} events`,
      moduleName: MODULE.CALENDAR,
    })

    return NextResponse.json({ 
      message: `Successfully imported ${created.count} events`,
      count: created.count,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Import Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

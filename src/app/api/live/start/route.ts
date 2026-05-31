import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManagerOrSuperAdmin } from '@/lib/auth'
import { eventIdToChannelName } from '@/lib/agora'

/**
 * Flip a CourseEvent into LIVE state. Called by the host when they click
 * "Go Live" in the broadcast UI. Idempotent — calling it on an already-LIVE
 * session just returns the current state.
 *
 * Body: { eventId: string }
 *
 * Only managers/super admins or the event's assigned instructor may start.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { eventId } = await request.json().catch(() => ({}))
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const event = await prisma.courseEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        courseId: true,
        instructorId: true,
        streamProvider: true,
        streamStatus: true,
        agoraChannelName: true,
        title: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (event.streamProvider !== 'AGORA') {
      return NextResponse.json({ error: 'This session is not configured for in-app live streaming.' }, { status: 400 })
    }

    const canStart =
      isManagerOrSuperAdmin(session.role) ||
      (!!event.instructorId && event.instructorId === session.userId)
    if (!canStart) {
      return NextResponse.json({ error: 'Only the assigned instructor or a manager can start this session.' }, { status: 403 })
    }

    if (event.streamStatus === 'LIVE') {
      return NextResponse.json({
        ok: true,
        already: true,
        streamStatus: event.streamStatus,
        agoraChannelName: event.agoraChannelName,
      })
    }
    if (event.streamStatus === 'ENDED') {
      return NextResponse.json({ error: 'This session has already ended.' }, { status: 409 })
    }

    const channelName = event.agoraChannelName || eventIdToChannelName(event.id)

    const updated = await prisma.courseEvent.update({
      where: { id: event.id },
      data: {
        streamStatus: 'LIVE',
        agoraChannelName: channelName,
        startedLiveAt: new Date(),
      },
      select: { id: true, streamStatus: true, agoraChannelName: true, startedLiveAt: true },
    })

    // TODO(notifications): fan out push to enrolled students that the
    // session is now live — once the FCM dispatch path is back on this
    // branch, post a notification with data.url = /courses/<courseId>/live/<eventId>.

    return NextResponse.json({ ok: true, ...updated })
  } catch (error: any) {
    console.error('Failed to start live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

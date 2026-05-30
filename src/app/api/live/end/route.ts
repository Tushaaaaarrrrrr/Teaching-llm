import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManagerOrSuperAdmin } from '@/lib/auth'

/**
 * Flip a CourseEvent out of LIVE state. Called by the host when they end
 * the broadcast. Idempotent — calling it on an already-ENDED session just
 * returns the current state.
 *
 * Body: { eventId: string }
 *
 * Only managers/super admins or the event's assigned instructor may end.
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
        instructorId: true,
        streamProvider: true,
        streamStatus: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (event.streamProvider !== 'AGORA') {
      return NextResponse.json({ error: 'This session is not configured for in-app live streaming.' }, { status: 400 })
    }

    const canEnd =
      isManagerOrSuperAdmin(session.role) ||
      (!!event.instructorId && event.instructorId === session.userId)
    if (!canEnd) {
      return NextResponse.json({ error: 'Only the assigned instructor or a manager can end this session.' }, { status: 403 })
    }

    if (event.streamStatus === 'ENDED') {
      return NextResponse.json({ ok: true, already: true, streamStatus: event.streamStatus })
    }

    const updated = await prisma.courseEvent.update({
      where: { id: event.id },
      data: {
        streamStatus: 'ENDED',
        endedLiveAt: new Date(),
      },
      select: { id: true, streamStatus: true, endedLiveAt: true },
    })

    return NextResponse.json({ ok: true, ...updated })
  } catch (error: any) {
    console.error('Failed to end live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

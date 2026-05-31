import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds, isManagerOrSuperAdmin } from '@/lib/auth'
import { mintAgoraRtcToken, eventIdToChannelName, AgoraRole } from '@/lib/agora'

/**
 * Mint an Agora RTC token for a specific CourseEvent.
 *
 * Body: { eventId: string }
 * Returns: { appId, channelName, uid, role, token, expiresAt }
 *
 * Role rules:
 *   HOST     — managers, super admins, or the event's assigned instructor.
 *   AUDIENCE — any other user who has access to the course.
 *
 * Anyone without course access gets 403.
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
        course: { select: { id: true, teacherName: true } },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (event.streamProvider !== 'AGORA') {
      return NextResponse.json({ error: 'This session is not configured for in-app live streaming.' }, { status: 400 })
    }

    // Access check — the session must belong to a course the user can access.
    if (event.courseId) {
      const accessible = await getAccessibleCourseIds(session.userId, session.role)
      if (accessible !== null && !accessible.includes(event.courseId)) {
        return NextResponse.json({ error: 'You are not enrolled in this course.' }, { status: 403 })
      }
    }

    // Role decision.
    const isHost =
      isManagerOrSuperAdmin(session.role) ||
      (!!event.instructorId && event.instructorId === session.userId)
    const role: AgoraRole = isHost ? 'HOST' : 'AUDIENCE'

    // Audience can only join once the session is actually LIVE.
    // (Hosts are allowed to join early so they can set up before going live.)
    if (!isHost && event.streamStatus !== 'LIVE') {
      return NextResponse.json({ error: 'This live session has not started yet.' }, { status: 409 })
    }

    const channelName = event.agoraChannelName || eventIdToChannelName(event.id)

    // If we generated the channel name on the fly (host joining before /start
    // has been called), persist it so the audience uses the same channel.
    if (!event.agoraChannelName && isHost) {
      await prisma.courseEvent.update({
        where: { id: event.id },
        data: { agoraChannelName: channelName },
      })
    }

    const minted = mintAgoraRtcToken({
      channelName,
      userId: session.userId,
      role,
    })

    return NextResponse.json(minted)
  } catch (error: any) {
    console.error('Agora token mint failed:', error)
    const message = error?.message?.includes('Agora credentials')
      ? error.message
      : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

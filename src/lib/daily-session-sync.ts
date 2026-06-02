import { prisma } from '@/lib/db'
import { getISTDayBoundaries, getEventStatus } from '@/lib/date-utils'

type SessionRole = {
  userId: string
  role: string
  accessibleCourseIds: string[] | null
  enrollmentTypes: Record<string, string> // courseId → 'LIVE' | 'RECORDED'
}

export async function syncTodaySessions(createdById: string) {
  const { startOfDay, endOfDay } = getISTDayBoundaries()

  const events = await prisma.courseEvent.findMany({
    where: {
      type: 'class',
      startTime: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { startTime: 'asc' },
  })

  await prisma.$transaction(async (tx) => {
    await (tx as any).dailySessionSnapshot.deleteMany({
      where: { snapshotDate: startOfDay },
    })

    if (events.length === 0) return

    await (tx as any).dailySessionSnapshot.createMany({
      data: events.map((event) => ({
        snapshotDate: startOfDay,
        sourceEventId: event.id,
        title: event.title,
        description: event.description || null,
        startTime: event.startTime,
        endTime: event.endTime,
        meetLink: event.meetLink || null,
        status: event.status,
        courseId: event.courseId,
        isGlobal: event.isGlobal,
        instructorId: event.instructorId || null,
        createdById,
      })),
    })
  })

  return { snapshotDate: startOfDay, count: events.length }
}

export async function getTodaySessionSnapshots(session: SessionRole) {
  const { startOfDay } = getISTDayBoundaries()

  const where: Record<string, unknown> = {
    snapshotDate: startOfDay,
  }

  if (session.accessibleCourseIds !== null) {
    where.OR = [
      { isGlobal: true },
      { courseId: { in: session.accessibleCourseIds } },
    ]
  }

  const snapshots = await (prisma as any).dailySessionSnapshot.findMany({
    where,
    include: {
      course: { select: { id: true, name: true, color: true, subject: true, teacherName: true, liveUpgradePrice: true } },
      instructor: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  // streamProvider / streamStatus / instructorId live on CourseEvent and change
  // at runtime (e.g. host clicks Go Live → status flips to LIVE). Snapshotting
  // them at day-start would go stale. Batch-fetch the source events instead so
  // the live-sessions list always reflects current state.
  const sourceEventIds: string[] = snapshots
    .map((s: any) => s.sourceEventId)
    .filter((id: any): id is string => !!id)
  const sourceEventsById = sourceEventIds.length === 0 ? new Map() : new Map(
    (await prisma.courseEvent.findMany({
      where: { id: { in: sourceEventIds } },
      select: {
        id: true,
        instructorId: true,
        streamProvider: true,
        streamStatus: true,
        agoraChannelName: true,
        startedLiveAt: true,
        endedLiveAt: true,
      },
    })).map(ev => [ev.id, ev]),
  )

  return snapshots.map((snapshot: any) => {
    // Backend enforcement: strip meetLink for RECORDED enrollments
    // Global sessions always keep their meetLink
    const courseId = snapshot.courseId
    const enrollmentType = courseId ? session.enrollmentTypes[courseId] : null
    const isRecordedOnly = enrollmentType === 'RECORDED'
    const isGlobal = snapshot.isGlobal

    // Managers see everything; for students, hide meetLink if RECORDED and not global
    const effectiveMeetLink = (isRecordedOnly && !isGlobal) ? null : snapshot.meetLink

    const liveEvent = snapshot.sourceEventId ? sourceEventsById.get(snapshot.sourceEventId) : null

    return {
      id: snapshot.id,
      sourceEventId: snapshot.sourceEventId,
      title: snapshot.title,
      description: snapshot.description,
      startTime: snapshot.startTime.toISOString(),
      endTime: snapshot.endTime.toISOString(),
      meetLink: effectiveMeetLink,
      status: getEventStatus(snapshot.startTime, snapshot.endTime, snapshot.status),
      manualStatus: snapshot.status,
      courseId: snapshot.courseId,
      course: snapshot.course,
      instructor: snapshot.instructor,
      // instructorId from the live event is authoritative — students can't host
      // even if the snapshot's instructor relation lags behind a reassignment.
      instructorId: liveEvent?.instructorId ?? snapshot.instructorId ?? null,
      isGlobal: snapshot.isGlobal,
      isRecordedOnly, // Pass to frontend so it knows to hide UI elements
      snapshotDate: snapshot.snapshotDate.toISOString(),
      syncedAt: snapshot.syncedAt.toISOString(),
      // Agora live-stream fields — always read from the live CourseEvent so
      // streamStatus reflects the host's most recent Go-Live/End action.
      streamProvider: liveEvent?.streamProvider ?? 'MEET',
      streamStatus: liveEvent?.streamStatus ?? 'SCHEDULED',
      agoraChannelName: liveEvent?.agoraChannelName ?? null,
      startedLiveAt: liveEvent?.startedLiveAt ? liveEvent.startedLiveAt.toISOString() : null,
      endedLiveAt: liveEvent?.endedLiveAt ? liveEvent.endedLiveAt.toISOString() : null,
    }
  })
}

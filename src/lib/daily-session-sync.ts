import { prisma } from '@/lib/db'
import { getISTDayBoundaries, getEventStatus } from '@/lib/date-utils'

type SessionRole = {
  userId: string
  role: string
  accessibleCourseIds: string[] | null
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
      course: { select: { id: true, name: true, color: true, subject: true, teacherName: true } },
      instructor: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  return snapshots.map((snapshot: any) => ({
    id: snapshot.id,
    sourceEventId: snapshot.sourceEventId,
    title: snapshot.title,
    description: snapshot.description,
    startTime: snapshot.startTime.toISOString(),
    endTime: snapshot.endTime.toISOString(),
    meetLink: snapshot.meetLink,
    status: getEventStatus(snapshot.startTime, snapshot.endTime, snapshot.status),
    manualStatus: snapshot.status,
    courseId: snapshot.courseId,
    course: snapshot.course,
    instructor: snapshot.instructor,
    isGlobal: snapshot.isGlobal,
    snapshotDate: snapshot.snapshotDate.toISOString(),
    syncedAt: snapshot.syncedAt.toISOString(),
  }))
}

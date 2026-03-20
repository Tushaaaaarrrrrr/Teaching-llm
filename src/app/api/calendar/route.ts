import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

function computeStatus(event: { startTime: Date; endTime: Date; manualStatus: string }) {
  if (event.manualStatus === 'CANCELLED') return 'cancelled'
  if (event.manualStatus === 'RESCHEDULED') return 'rescheduled'
  const now = new Date()
  if (now < event.startTime) return 'upcoming'
  if (now >= event.startTime && now <= event.endTime) return 'live'
  return 'completed'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const type = searchParams.get('type')

    const where: any = {
      // Must belong to a valid course, per requirements (no courseId = ignore, unless it's explicitly GLOBAL? The prompt says "If there are no events mapped to a course... Show nothing").
      // We will allow courseId != null ONLY. Wait, GLOBAL events might still have courseId = null. The prompt specifically said:
      // "If there are no events mapped to a course (no matching course ID in event description), then: Show nothing. Ignore the event completely."
      // So we only return events where courseId is NOT null.
      courseId: { not: null }
    }

    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59, 999)
      where.startTime = { gte: start, lte: end }
    }

    if (type) where.type = type

    // Fetch ALL mapped events globally (visible to all users), but strip sensitive data
    const events = await prisma.courseEvent.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, color: true } },
        instructor: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    })

    const mapped = events.map((ev: any) => {
      const status = computeStatus(ev)

      return {
        id: ev.id,
        title: ev.title,
        startTime: ev.startTime.toISOString(),
        endTime: ev.endTime.toISOString(),
        meetLink: null, // Stripped for security
        description: null, // Stripped for security
        type: ev.type,
        manualStatus: ev.manualStatus,
        status,
        courseId: ev.courseId,
        course: {
          id: ev.course?.id,
          name: ev.course?.name,
          color: ev.course?.color,
          teacherName: ev.course?.teacherName || null
        },
        instructorId: null,
        instructor: ev.instructor,
      }
    })

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching global calendar events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

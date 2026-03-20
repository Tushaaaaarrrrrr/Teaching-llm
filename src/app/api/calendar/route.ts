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

    const enrolledCourses = await prisma.enrollment.findMany({
      where: { userId: session.userId },
      select: { courseId: true }
    })
    const enrolledCourseIds = enrolledCourses.map(e => e.courseId)

    const where: any = {
      courseId: { not: null }
    }

    if (session.role === 'STUDENT') {
      where.courseId = { in: enrolledCourseIds }
    }

    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59, 999)
      where.startTime = { gte: start, lte: end }
    }

    if (type) where.type = type

    // Fetch ONLY mapped events the user has access to
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

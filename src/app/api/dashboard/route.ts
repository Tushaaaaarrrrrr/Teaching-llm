import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'

// Compute status dynamically
function computeStatus(event: { startTime: Date; endTime: Date; manualStatus: string }) {
  if (event.manualStatus === 'CANCELLED') return 'cancelled'
  if (event.manualStatus === 'RESCHEDULED') return 'rescheduled'
  const now = new Date()
  if (now < event.startTime) return 'upcoming'
  if (now >= event.startTime && now <= event.endTime) return 'live'
  return 'completed'
}

export async function GET() {
  try {
    const session = await getFullSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accessibleCourseIds } = session
    const courseFilter = accessibleCourseIds !== null
      ? { courseId: { in: accessibleCourseIds } }
      : {}
    const courseCountFilter = accessibleCourseIds !== null
      ? { id: { in: accessibleCourseIds } }
      : {}

    // Build event filter for accessible courses
    const eventCourseFilter = accessibleCourseIds !== null
      ? { OR: [{ courseId: null }, { courseId: { in: accessibleCourseIds } }] }
      : {}

    const now = new Date()

    const [
      totalCourses, 
      totalLectures, 
      totalStudents, 
      totalMaterials,
      courseEvents,
      lectures,
      announcements
    ] = await Promise.all([
      prisma.course.count({ where: courseCountFilter }),
      prisma.lecture.count({ where: courseFilter }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.material.count({ where: courseFilter }),
      prisma.courseEvent.findMany({
        where: {
          type: 'class',
          manualStatus: { not: 'CANCELLED' },
          ...eventCourseFilter,
        },
        include: { course: true, instructor: true },
        orderBy: { startTime: 'asc' },
        take: 10
      }),
      prisma.lecture.findMany({
        where: courseFilter,
        include: { course: true },
        orderBy: { uploadedAt: 'desc' },
        take: 3
      }),
      prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ])

    // Count upcoming sessions (startTime > now, not cancelled)
    const upcomingLiveCount = courseEvents.filter(e => {
      const status = computeStatus(e)
      return status === 'upcoming' || status === 'live'
    }).length

    // Map CourseEvents to the format expected by the frontend
    const mappedSessions = courseEvents.map((s: any) => {
      const status = computeStatus(s)
      return {
        id: s.id,
        title: s.title,
        instructor: s.instructor?.name || 'Unknown',
        date: s.startTime.toISOString().split('T')[0],
        time: s.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        status,
        meetingLink: s.meetLink || '',
        course: { name: s.course?.name || 'General' }
      }
    })

    return NextResponse.json({
      stats: {
        totalCourses,
        totalLectures,
        totalStudents,
        upcomingSessions: upcomingLiveCount,
        totalMaterials,
      },
      liveSessions: mappedSessions,
      lectures,
      announcements,
      user: {
        role: session.role,
        name: session.name,
        userId: session.userId
      }
    })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

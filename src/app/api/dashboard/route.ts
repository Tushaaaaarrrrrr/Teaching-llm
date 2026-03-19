import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'

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

    const [
      totalCourses, 
      totalLectures, 
      totalStudents, 
      upcomingLiveCount, 
      totalMaterials,
      liveSessions,
      lectures,
      announcements
    ] = await Promise.all([
      prisma.course.count({ where: courseCountFilter }),
      prisma.lecture.count({ where: courseFilter }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.calendarEvent.count({
        where: {
          type: 'live',
          status: 'scheduled',
          ...courseFilter,
        },
      }),
      prisma.material.count({ where: courseFilter }),
      prisma.calendarEvent.findMany({
        where: {
          type: 'live',
          ...courseFilter,
        },
        include: { course: true, instructor: true },
        orderBy: { date: 'asc' },
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

    // Map CalendarEvents to the LiveSession format expected by the frontend
    const mappedSessions = liveSessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      instructor: s.instructor?.name || 'Unknown',
      date: s.date,
      time: s.time || 'TBD',
      status: s.status || 'scheduled',
      meetingLink: s.meetingLink || '',
      course: { name: s.course?.name || 'General' }
    }))

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

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    const courseFilter = accessibleCourseIds !== null
      ? { courseId: { in: accessibleCourseIds } }
      : {}
    const courseCountFilter = accessibleCourseIds !== null
      ? { id: { in: accessibleCourseIds } }
      : {}

    const now = new Date()

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
      (prisma.course as any).count({ where: courseCountFilter }),
      (prisma.lecture as any).count({ where: courseFilter as any }),
      (prisma.user as any).count({ where: { role: 'STUDENT' } }),
      (prisma.calendarEvent as any).count({
        where: {
          type: 'live',
          expiresAt: { gt: now },
          ...courseFilter,
        } as any,
      }),
      (prisma.material as any).count({ where: courseFilter as any }),
      (prisma.calendarEvent as any).findMany({
        where: {
          type: 'live',
          ...courseFilter,
        } as any,
        include: { course: true, instructor: true },
        orderBy: { startDate: 'asc' },
        take: 10
      }),
      (prisma.lecture as any).findMany({
        where: courseFilter as any,
        include: { course: true },
        orderBy: { uploadedAt: 'desc' },
        take: 3
      }),
      (prisma.announcement as any).findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ])

    // Map CalendarEvents to the LiveSession format expected by the frontend
    const mappedSessions = liveSessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      instructor: s.instructor?.name || 'Unknown',
      date: new Date(s.startDate).toLocaleDateString(),
      time: new Date(s.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

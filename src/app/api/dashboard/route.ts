import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'
import { getTodaySessionSnapshots } from '@/lib/daily-session-sync'

// Compute status dynamically
// Status calculation now handled by getEventStatus in @/lib/date-utils

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

    const now = new Date()

    const userDb = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { hasSeenWelcome: true }
    })

    const [totalCourses, totalLectures, totalStudents, totalMaterials] = await Promise.all([
      prisma.course.count({ where: courseCountFilter }),
      prisma.content.count({ 
        where: { 
          topic: accessibleCourseIds !== null ? { courseId: { in: accessibleCourseIds } } : {},
          videoUrl: { not: null },
          NOT: { videoUrl: "" }
        } 
      }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.content.count({ 
        where: { 
          topic: accessibleCourseIds !== null ? { courseId: { in: accessibleCourseIds } } : {},
          pptUrl: { not: null },
          NOT: { pptUrl: "" }
        } 
      }),
    ])

    const [
      syncedSessions,
      lectures,
      announcements,
      examCountdown,
      upcomingExams,
      openTicketsCount,
      activeChatSessionsCount,
      activeAgentsCount
    ] = await Promise.all([
      getTodaySessionSnapshots(session),
      prisma.lecture.findMany({
        where: courseFilter,
        include: { course: true },
        orderBy: { uploadedAt: 'desc' },
        take: 3
      }),
      prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
      }),
      (prisma as any).examCountdown.findFirst(),
      prisma.exam.findMany({
        where: {
          ...courseFilter,
          isPublished: true,
          expiresAt: { gt: now },
        },
        include: { course: { select: { name: true, color: true } } },
        orderBy: { startDate: 'asc' },
        take: 3
      }),
      prisma.supportTicket.count({
        where: { status: 'OPEN' }
      }),
      prisma.chatSession.count({
        where: { status: { in: ['WAITING', 'ACTIVE'] } }
      }),
      prisma.user.count({
        where: {
          role: { in: ['MANAGER', 'ADMIN'] },
          updatedAt: { gt: new Date(Date.now() - 5 * 60 * 1000) }
        }
      })
    ])

    const upcomingSessionsCount = syncedSessions.filter((session: any) => session.status === 'upcoming').length
    const activeSessionsCount = syncedSessions.filter((session: any) => session.status === 'live').length

    // Calculate daysLeft from deadlineDate for examCountdown
    const examCountdownWithDays = examCountdown && examCountdown.deadlineDate
      ? {
          ...examCountdown,
          daysLeft: Math.max(0, Math.ceil((new Date(examCountdown.deadlineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        }
      : examCountdown

    return NextResponse.json({
      stats: {
        totalCourses,
        totalLectures,
        totalStudents,
        upcomingSessions: upcomingSessionsCount,
        totalMaterials,
        activeSessions: activeSessionsCount,
      },
      liveSessions: syncedSessions,
      lectures,
      announcements,
      upcomingExams,
      examCountdown: examCountdownWithDays,
      supportSummary: {
        openTickets: openTicketsCount,
        activeChats: activeChatSessionsCount,
        isSupportActive: activeAgentsCount > 0
      },
      user: {
        role: session.role,
        name: session.name,
        userId: session.userId,
        hasSeenWelcome: userDb?.hasSeenWelcome || false,
      }
    })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

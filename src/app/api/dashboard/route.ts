import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'
import { getTodaySessionSnapshots } from '@/lib/daily-session-sync'
import { processProgressQueue } from '@/lib/progress-processor'

// Compute status dynamically
// Status calculation now handled by getEventStatus in @/lib/date-utils

export async function GET() {
  try {
    const session = await getFullSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process any pending progress updates before fetching dashboard data
    await processProgressQueue().catch(err => console.error('Dashboard sync error:', err))

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
      recentViewedLecture,
      announcements,
      examCountdown,
      upcomingExams,
      openTicketsCount,
      activeChatSessionsCount,
      activeAgentsCount
    ] = await Promise.all([
      getTodaySessionSnapshots(session),
      prisma.lectureProgress.findFirst({
        where: {
          userId: session.userId,
          updatedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              topic: {
                select: {
                  courseId: true,
                  course: {
                    select: { name: true, color: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
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

    // For students with RECORDED enrollment, hide "Active Now" sessions for those courses
    // They can still see upcoming/completed sessions so they know the schedule
    const filteredSessions = syncedSessions.map((s: any) => {
      // If the session is marked as recordedOnly (set by backend in daily-session-sync),
      // and it is currently live, hide it from the dashboard
      if (s.isRecordedOnly && s.status === 'live') {
        return null // Remove active sessions for recorded-only courses
      }
      return s
    }).filter(Boolean)

    const upcomingSessionsCount = filteredSessions.filter((session: any) => session.status === 'upcoming').length
    const activeSessionsCount = filteredSessions.filter((session: any) => session.status === 'live').length

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
      liveSessions: filteredSessions,
      recentViewedLecture,
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

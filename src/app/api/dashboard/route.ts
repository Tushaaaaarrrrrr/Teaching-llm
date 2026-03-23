import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'

const statsCache = new Map<string, {
  totalCourses: number;
  totalLectures: number;
  totalStudents: number;
  totalMaterials: number;
  timestamp: number;
}>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

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

    const userDb = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { hasSeenWelcome: true }
    })

    const cacheKey = session.role === 'MANAGER' ? 'MANAGER' : (accessibleCourseIds?.join(',') || 'empty');
    let cachedStats = statsCache.get(cacheKey);
    let totalCourses = 0, totalLectures = 0, totalStudents = 0, totalMaterials = 0;

    if (cachedStats && now.getTime() - cachedStats.timestamp < CACHE_TTL) {
      totalCourses = cachedStats.totalCourses;
      totalLectures = cachedStats.totalLectures;
      totalStudents = cachedStats.totalStudents;
      totalMaterials = cachedStats.totalMaterials;
    } else {
      [totalCourses, totalLectures, totalStudents, totalMaterials] = await Promise.all([
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
      ]);
      statsCache.set(cacheKey, { totalCourses, totalLectures, totalStudents, totalMaterials, timestamp: now.getTime() });
    }

    const [
      courseEvents,
      lectures,
      announcements,
      examCountdown,
      upcomingExams,
      openTicketsCount,
      activeChatSessionsCount,
      activeAgentsCount,
      activeSessionsCount
    ] = await Promise.all([
      prisma.courseEvent.findMany({
        where: {
          type: { in: ['class', 'live'] },
          manualStatus: { not: 'CANCELLED' },
          ...eventCourseFilter,
          endTime: { gte: now } // Only show current or future events
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
      }),
      prisma.user.count({
        where: {
          updatedAt: { gt: new Date(Date.now() - 5 * 60 * 1000) }
        }
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
        activeSessions: activeSessionsCount,
      },
      liveSessions: mappedSessions,
      lectures,
      announcements,
      upcomingExams,
      examCountdown,
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

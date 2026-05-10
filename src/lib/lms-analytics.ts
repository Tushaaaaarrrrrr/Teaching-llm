/**
 * LMS Analytics Engine
 *
 * Precomputes daily analytics from existing LMS tables.
 * This module ONLY READS from: User, Enrollment, ActivityLog, LoginLog, Course
 * It ONLY WRITES to: AnalyticsSnapshot, AnalyticsCourseDaily, AnalyticsConfig
 *
 * No existing table is modified.
 */

import { prisma } from '../lib/db'

/**
 * Get start and end of a given day in UTC
 */
function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Main aggregation function — computes and stores analytics for a specific day.
 * Safe to call multiple times (upserts).
 */
export async function computeDailyAnalytics(targetDate: Date): Promise<{
  success: boolean
  date: string
  metrics: Record<string, unknown>
}> {
  const { start, end } = getDayBounds(targetDate)
  const dateOnly = new Date(start) // normalized date for storage

  // ─── 1. Total Students (cumulative up to this day) ─────────────────
  const totalUsers = await (prisma.user as any).count({
    where: {
      role: 'STUDENT',
      isTerminated: false,
      createdAt: { lte: end },
    },
  })

  // ─── 2. New Users (created on this specific day) ───────────────────
  const newUsers = await (prisma.user as any).count({
    where: {
      role: 'STUDENT',
      createdAt: { gte: start, lte: end },
    },
  })

  // ─── 3. Active Users (unique users in ActivityLog on this day) ─────
  const activeUserRows = await prisma.activityLog.findMany({
    where: { timestamp: { gte: start, lte: end } },
    select: { userId: true },
    distinct: ['userId'],
  })
  const activeUsers = activeUserRows.length
  const activeUserIds = new Set(activeUserRows.map(r => r.userId))

  // ─── 4. Returning Users (active today AND created before today) ────
  let returningUsers = 0
  if (activeUserIds.size > 0) {
    returningUsers = await (prisma.user as any).count({
      where: {
        id: { in: Array.from(activeUserIds) },
        createdAt: { lt: start },
      },
    })
  }

  // ─── 5. Enrollments created on this day ────────────────────────────
  const totalEnrollments = await (prisma.enrollment as any).count({
    where: { createdAt: { gte: start, lte: end } },
  })

  // ─── 6. Average courses per student ────────────────────────────────
  const totalEnrollmentsAllTime = await (prisma.enrollment as any).count()
  const avgCoursesPerStudent = totalUsers > 0
    ? Math.round((totalEnrollmentsAllTime / totalUsers) * 100) / 100
    : 0

  // ─── 7. Hourly Activity Distribution ──────────────────────────────
  const allActivityLogs = await prisma.activityLog.findMany({
    where: { timestamp: { gte: start, lte: end } },
    select: { timestamp: true },
  })
  const hourlyMap: Record<string, number> = {}
  for (let h = 0; h < 24; h++) hourlyMap[String(h)] = 0
  for (const log of allActivityLogs) {
    const hour = new Date(log.timestamp).getUTCHours()
    // Convert UTC to IST (+5:30) for meaningful "peak hours"
    const istHour = (hour + 5 + Math.floor((30) / 60)) % 24
    hourlyMap[String(istHour)] = (hourlyMap[String(istHour)] || 0) + 1
  }

  // ─── 8. Per-Course Enrollment Stats ────────────────────────────────
  const courses = await (prisma.course as any).findMany({
    select: { id: true, name: true },
  })

  const courseStats: { courseId: string; name: string; count: number; total: number }[] = []

  for (const course of courses) {
    // Exclude Demo Course from analytics tracking
    if (course.id === 'cmn2sm2gl000fcqgo540cdrbj') continue
    const dayCount = await (prisma.enrollment as any).count({
      where: { courseId: course.id, createdAt: { gte: start, lte: end } },
    })
    const cumulative = await (prisma.enrollment as any).count({
      where: { courseId: course.id, createdAt: { lte: end } },
    })
    courseStats.push({
      courseId: course.id,
      name: course.name,
      count: dayCount,
      total: cumulative,
    })
  }

  // Top 7 by cumulative enrollments
  const topCourses = [...courseStats]
    .sort((a, b) => b.total - a.total)
    .slice(0, 7)
    .map(c => ({ courseId: c.courseId, name: c.name, count: c.total }))

  // Full distribution (all courses with at least 1 enrollment)
  const courseDistribution = courseStats
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(c => ({ courseId: c.courseId, name: c.name, count: c.total }))

  // ─── 9. Yesterday's per-course for growth delta ────────────────────
  const yesterday = new Date(start)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStats = await (prisma.analyticsCourseDaily as any).findMany({
    where: {
      date: {
        gte: new Date(yesterday.setUTCHours(0, 0, 0, 0)),
        lte: new Date(yesterday.setUTCHours(23, 59, 59, 999)),
      },
    },
  })
  const yesterdayMap = new Map<string, number>(
    yesterdayStats.map((s: any) => [s.courseId, s.enrollmentCount])
  )

  // ─── 9.5 Audience Demographics ─────────────────────────────────────
  const allUsers = await (prisma.user as any).findMany({
    where: { role: 'STUDENT', isTerminated: false },
    select: { gender: true, state: true, age: true }
  })
  
  const demographics: any = {
    gender: { MALE: 0, FEMALE: 0, OTHER: 0, UNSPECIFIED: 0 },
    state: {},
    age: { 'Under 18': 0, '18-24': 0, '25-34': 0, '35+': 0, 'Unknown': 0 }
  }

  for (const u of allUsers) {
    const g = u.gender || 'UNSPECIFIED'
    if (demographics.gender[g] !== undefined) demographics.gender[g]++
    else demographics.gender['UNSPECIFIED']++

    const s = u.state || 'Unknown'
    demographics.state[s] = (demographics.state[s] || 0) + 1

    if (u.age) {
      if (u.age < 18) demographics.age['Under 18']++
      else if (u.age <= 24) demographics.age['18-24']++
      else if (u.age <= 34) demographics.age['25-34']++
      else demographics.age['35+']++
    } else {
      demographics.age['Unknown']++
    }
  }

  // ─── 10. Upsert AnalyticsSnapshot ──────────────────────────────────
  await (prisma.analyticsSnapshot as any).upsert({
    where: { date: dateOnly },
    create: {
      date: dateOnly,
      totalUsers,
      newUsers,
      returningUsers,
      activeUsers,
      totalEnrollments,
      avgCoursesPerStudent,
      hourlyActivity: JSON.stringify(hourlyMap),
      topCourses: JSON.stringify(topCourses),
      courseDistribution: JSON.stringify(courseDistribution),
      demographics: JSON.stringify(demographics),
    },
    update: {
      totalUsers,
      newUsers,
      returningUsers,
      activeUsers,
      totalEnrollments,
      avgCoursesPerStudent,
      hourlyActivity: JSON.stringify(hourlyMap),
      topCourses: JSON.stringify(topCourses),
      courseDistribution: JSON.stringify(courseDistribution),
      demographics: JSON.stringify(demographics),
    },
  })

  // ─── 11. Upsert AnalyticsCourseDaily for each course ───────────────
  for (const cs of courseStats) {
    const growthDelta = cs.count - (yesterdayMap.get(cs.courseId) || 0)
    await (prisma.analyticsCourseDaily as any).upsert({
      where: { date_courseId: { date: dateOnly, courseId: cs.courseId } },
      create: {
        date: dateOnly,
        courseId: cs.courseId,
        courseName: cs.name,
        enrollmentCount: cs.count,
        totalEnrollments: cs.total,
        growthDelta,
      },
      update: {
        courseName: cs.name,
        enrollmentCount: cs.count,
        totalEnrollments: cs.total,
        growthDelta,
      },
    })
  }

  // ─── 12. Update AnalyticsConfig singleton ──────────────────────────
  await (prisma.analyticsConfig as any).upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastUpdatedAt: new Date(), cronIntervalHours: 24 },
    update: { lastUpdatedAt: new Date() },
  })

  return {
    success: true,
    date: dateOnly.toISOString().split('T')[0],
    metrics: {
      totalUsers,
      newUsers,
      returningUsers,
      activeUsers,
      totalEnrollments,
      avgCoursesPerStudent,
      coursesProcessed: courseStats.length,
    },
  }
}

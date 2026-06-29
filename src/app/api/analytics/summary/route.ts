import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * GET /api/analytics/summary?range=7d
 *
 * Read-only endpoint that returns precomputed analytics.
 * No heavy queries — reads directly from AnalyticsSnapshot & AnalyticsCourseDaily.
 * Auth: Manager/Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['MANAGER', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'

    // ─── Calculate date range ────────────────────────────────────────
    const now = new Date()
    const today = new Date(now)
    today.setUTCHours(23, 59, 59, 999)

    let startDate: Date

    switch (range) {
      case 'today': {
        startDate = new Date(now)
        startDate.setUTCHours(0, 0, 0, 0)
        break
      }
      case 'yesterday': {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 1)
        startDate.setUTCHours(0, 0, 0, 0)
        // For yesterday, also cap the end
        today.setDate(now.getDate() - 1)
        today.setUTCHours(23, 59, 59, 999)
        break
      }
      case '7d': {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 6)
        startDate.setUTCHours(0, 0, 0, 0)
        break
      }
      case '30d': {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 29)
        startDate.setUTCHours(0, 0, 0, 0)
        break
      }
      case '3m': {
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - 3)
        startDate.setUTCHours(0, 0, 0, 0)
        break
      }
      default: {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 6)
        startDate.setUTCHours(0, 0, 0, 0)
      }
    }

    // ─── Fetch snapshots for range ───────────────────────────────────
    const snapshots = await (prisma.analyticsSnapshot as any).findMany({
      where: { date: { gte: startDate, lte: today } },
      orderBy: { date: 'asc' },
    })

    // ─── Fetch course daily stats for range ──────────────────────────
    const courseDaily = await (prisma.analyticsCourseDaily as any).findMany({
      where: { date: { gte: startDate, lte: today } },
      orderBy: { date: 'asc' },
    })

    // ─── Fetch analytics config for timer ────────────────────────────
    let config = await (prisma.analyticsConfig as any).findUnique({
      where: { id: 'singleton' },
    })
    if (!config) {
      config = { lastUpdatedAt: null, cronIntervalHours: 24 }
    }

    // ─── Aggregate across the range ──────────────────────────────────
    let totalNewUsers = 0
    let totalReturningUsers = 0
    let totalActiveUsers = 0
    let totalEnrollments = 0

    // Merge hourly activity across all days in range
    const mergedHourly: Record<string, number> = {}
    for (let h = 0; h < 24; h++) mergedHourly[String(h)] = 0

    for (const snap of snapshots) {
      totalNewUsers += snap.newUsers
      totalReturningUsers += snap.returningUsers
      totalActiveUsers += snap.activeUsers
      totalEnrollments += snap.totalEnrollments

      if (snap.hourlyActivity) {
        try {
          const hourly = JSON.parse(snap.hourlyActivity)
          for (const [hour, count] of Object.entries(hourly)) {
            mergedHourly[hour] = (mergedHourly[hour] || 0) + (count as number)
          }
        } catch {}
      }
    }

    // Use the latest snapshot for current totals
    let latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

    // Fallback: If no snapshot found in range, get the latest one available before this range
    if (!latest) {
      latest = await (prisma.analyticsSnapshot as any).findFirst({
        where: { date: { lt: startDate } },
        orderBy: { date: 'desc' },
      })
    }

    // Parse latest topCourses, courseDistribution
    let topCourses = []
    let courseDistribution = []
    let demographics = null
    if (latest) {
      try { topCourses = JSON.parse(latest.topCourses || '[]') } catch {}
      try { courseDistribution = JSON.parse(latest.courseDistribution || '[]') } catch {}
    }

    // Compute live demographics to ensure up-to-the-minute correctness and include new fields
    try {
      const allUsers = await prisma.user.findMany({
        where: { role: 'STUDENT', isTerminated: false },
        select: { gender: true, state: true, age: true, iitmJoinYear: true, iitmJoinMonth: true, iitmLevel: true, iitmUserType: true }
      })
      
      const liveDemographics: any = {
        gender: { MALE: 0, FEMALE: 0, OTHER: 0, UNSPECIFIED: 0 },
        state: {},
        age: { 'Under 18': 0, '18-24': 0, '25-34': 0, '35+': 0, 'Unknown': 0 },
        iitmJoinYear: {},
        iitmJoinMonth: {},
        iitmLevel: {},
        iitmUserType: {}
      }

      for (const u of allUsers) {
        const g = u.gender || 'UNSPECIFIED'
        if (liveDemographics.gender[g] !== undefined) liveDemographics.gender[g]++
        else liveDemographics.gender['UNSPECIFIED']++

        const s = u.state || 'Unknown'
        liveDemographics.state[s] = (liveDemographics.state[s] || 0) + 1

        if (u.age) {
          if (u.age < 18) liveDemographics.age['Under 18']++
          else if (u.age <= 24) liveDemographics.age['18-24']++
          else if (u.age <= 34) liveDemographics.age['25-34']++
          else liveDemographics.age['35+']++
        } else {
          liveDemographics.age['Unknown']++
        }

        if (u.iitmJoinYear) {
          liveDemographics.iitmJoinYear[u.iitmJoinYear] = (liveDemographics.iitmJoinYear[u.iitmJoinYear] || 0) + 1
        }
        if (u.iitmJoinMonth) {
          liveDemographics.iitmJoinMonth[u.iitmJoinMonth] = (liveDemographics.iitmJoinMonth[u.iitmJoinMonth] || 0) + 1
        }
        if (u.iitmLevel) {
          liveDemographics.iitmLevel[u.iitmLevel] = (liveDemographics.iitmLevel[u.iitmLevel] || 0) + 1
        }
        if (u.iitmUserType) {
          liveDemographics.iitmUserType[u.iitmUserType] = (liveDemographics.iitmUserType[u.iitmUserType] || 0) + 1
        }
      }
      demographics = liveDemographics
    } catch (e) {
      console.error('[Analytics Summary] Failed to compute live demographics, fallback to snapshot', e)
      if (latest) {
        try { demographics = JSON.parse(latest.demographics || 'null') } catch {}
      }
    }

    // ─── Build daily trend data ──────────────────────────────────────
    const dailyTrend = snapshots.map((s: any) => ({
      date: s.date,
      enrollments: s.totalEnrollments,
      newUsers: s.newUsers,
      activeUsers: s.activeUsers,
    }))

    // ─── Build course growth data ────────────────────────────────────
    // Group by courseId, take the latest entry for each
    const courseGrowthMap = new Map<string, any>()
    for (const cd of courseDaily) {
      courseGrowthMap.set(cd.courseId, {
        courseId: cd.courseId,
        courseName: cd.courseName,
        enrollmentCount: cd.enrollmentCount,
        totalEnrollments: cd.totalEnrollments,
        growthDelta: cd.growthDelta,
      })
    }
    const courseGrowth = Array.from(courseGrowthMap.values())
      .sort((a, b) => b.totalEnrollments - a.totalEnrollments)

    return NextResponse.json({
      range,
      timer: {
        lastUpdatedAt: config.lastUpdatedAt,
        cronIntervalHours: config.cronIntervalHours,
      },
      summary: {
        totalUsers: latest?.totalUsers || 0,
        newUsers: totalNewUsers,
        returningUsers: totalReturningUsers,
        activeUsers: totalActiveUsers,
        totalEnrollments,
        avgCoursesPerStudent: latest?.avgCoursesPerStudent || 0,
      },
      dailyTrend,
      hourlyActivity: mergedHourly,
      topCourses,
      courseDistribution,
      courseGrowth,
      demographics,
    })
  } catch (error) {
    console.error('[Analytics Summary] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

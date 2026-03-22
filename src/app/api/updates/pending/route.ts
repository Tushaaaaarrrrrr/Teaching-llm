import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'

/**
 * GET /api/updates/pending
 * Returns pending (unseen) system updates for the current user at login.
 * Priority order: WELCOME > DAILY_DIGEST > GENERAL
 */
export async function GET() {
  try {
    const session = await getFullSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const userId = session.userId
    const userRole = session.role

    // Fetch the user to check hasSeenWelcome and lastDailyDigestAt
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hasSeenWelcome: true, lastDailyDigestAt: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all active, non-expired, scheduled (or immediate) updates
    // that this user has NOT viewed yet
    const updates = await prisma.systemUpdate.findMany({
      where: {
        isActive: true,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
        // Filter: user hasn't viewed this update
        NOT: {
          views: { some: { userId } },
        },
        // Filter by target role
        ...(userRole !== 'MANAGER' ? {
          OR: [
            { targetRole: null },
            { targetRole: userRole },
          ],
        } : {}),
        // Filter by course enrollment for students
        ...(userRole === 'STUDENT' ? {
          OR: [
            { courseId: null },
            { course: { enrollments: { some: { userId } } } },
          ],
        } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    // Separate by type and enforce priority order
    const welcomeUpdates = updates.filter(u => u.type === 'WELCOME')
    const digestUpdates = updates.filter(u => u.type === 'DAILY_DIGEST')
    const generalUpdates = updates.filter(u => u.type === 'GENERAL')

    const pending: typeof updates = []

    // 1. Welcome messages — only if user hasn't seen welcome yet
    if (!user.hasSeenWelcome && welcomeUpdates.length > 0) {
      pending.push(welcomeUpdates[0]) // Only the highest priority welcome
    }

    // 2. Daily digest — only first login of the day (Reset at 5:00 AM)
    const todayReset = new Date(now)
    todayReset.setHours(5, 0, 0, 0)
    
    // If current time is before 5 AM, the "today" reset was actually yesterday 5 AM
    if (now < todayReset) {
      todayReset.setDate(todayReset.getDate() - 1)
    }

    const isFirstLoginToday = !user.lastDailyDigestAt || user.lastDailyDigestAt < todayReset

    if (isFirstLoginToday && digestUpdates.length > 0) {
      pending.push(digestUpdates[0])
    }

    // 3. General updates — all unseen, ordered by priority
    pending.push(...generalUpdates)

    // Build daily digest data if applicable
    let dailyDigest = null
    if (isFirstLoginToday && userRole !== 'MANAGER') {
      const lastLogin = user.lastDailyDigestAt || user.createdAt

      const [newLectures, newMaterials, upcomingExams] = await Promise.all([
        // Count new lectures in enrolled courses since last login
        prisma.content.count({
          where: {
            createdAt: { gt: lastLogin },
            videoUrl: { not: null },
            NOT: { videoUrl: '' },
            topic: {
              course: {
                enrollments: { some: { userId } },
              },
            },
          },
        }),
        // Count new materials in enrolled courses since last login
        prisma.content.count({
          where: {
            createdAt: { gt: lastLogin },
            pptUrl: { not: null },
            NOT: { pptUrl: '' },
            topic: {
              course: {
                enrollments: { some: { userId } },
              },
            },
          },
        }),
        // Count upcoming exams in enrolled courses
        prisma.exam.count({
          where: {
            expiresAt: { gt: now },
            isPublished: true,
            course: {
              enrollments: { some: { userId } },
            },
          },
        }),
      ])

      dailyDigest = { newLectures, newMaterials, upcomingExams }

      // Update lastDailyDigestAt
      await prisma.user.update({
        where: { id: userId },
        data: { lastDailyDigestAt: now },
      })
    }

    return NextResponse.json({
      updates: pending.map(u => {
        let title = u.title
        let content = u.content

        // System-controlled content for DAILY_DIGEST
        if (u.type === 'DAILY_DIGEST' && dailyDigest) {
          title = "Today's Summary"
          const updatesList = []
          if (dailyDigest.newLectures > 0) updatesList.push(`<li><b>${dailyDigest.newLectures}</b> new lectures added</li>`)
          if (dailyDigest.newMaterials > 0) updatesList.push(`<li><b>${dailyDigest.newMaterials}</b> new materials & resources</li>`)
          if (dailyDigest.upcomingExams > 0) updatesList.push(`<li><b>${dailyDigest.upcomingExams}</b> upcoming exams tracked</li>`)
          
          if (updatesList.length > 0) {
            content = `Today in your courses:<ul style="margin-top: 10px; padding-left: 20px;">${updatesList.join('')}</ul>`
          } else {
            content = "Keep up the great work! No new updates in your courses since your last visit, but stay tuned for more."
          }
        }

        return {
          id: u.id,
          title,
          content,
          type: u.type,
          imageUrl: u.imageUrl,
          animationType: u.animationType,
          showDelay: u.showDelay,
          priority: u.priority,
          ctaText: u.ctaText,
          ctaLink: u.ctaLink,
        }
      }),
      dailyDigest,
    })
  } catch (error) {
    console.error('Error fetching pending updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

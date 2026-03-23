import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'

/**
 * GET /api/updates/pending
 * Returns messages the current user should see on login.
 * Rules:
 *  - WELCOME: only if welcomeEnabled AND isActive AND !hasSeenWelcome
 *  - CUSTOM:  only if customEnabled AND isActive AND
 *               (ONCE: never viewed it)
 *               (RECURRING: either never viewed OR last view > intervalDays ago)
 *           AND (courseIds is empty = global, OR user enrolled in ≥1 target course)
 *           AND de-duplicate: same message shown only once even if multiple enrolled courses match
 */
export async function GET() {
  try {
    const session = await getFullSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId
    const now = new Date()

    // Get user + settings in parallel
    const [user, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { hasSeenWelcome: true, enrollments: { select: { courseId: true } } },
      }),
      prisma.updateSystemSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', welcomeEnabled: true, customEnabled: true },
        update: {},
      }),
    ])

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const enrolledCourseIds = new Set(user.enrollments.map((e: { courseId: string }) => e.courseId))

    // Fetch all active WELCOME and CUSTOM updates
    const allActive = await prisma.systemUpdate.findMany({
      where: { isActive: true, type: { in: ['WELCOME', 'CUSTOM'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        views: {
          where: { userId },
          select: { viewedAt: true },
        },
      },
    })

    const pending = []

    for (const update of allActive) {
      const view = update.views[0] ?? null

      if (update.type === 'WELCOME') {
        if (!settings.welcomeEnabled) continue
        if (user.hasSeenWelcome) continue
        pending.push(update)
        continue
      }

      // CUSTOM
      if (!settings.customEnabled) continue

      // Scheduling check
      if (update.startDate && now < new Date(update.startDate)) continue
      if (update.endDate && now > new Date(update.endDate)) continue

      // Frequency check
      if (update.frequency === 'ONCE') {
        if (view) continue // already seen
      } else if (update.frequency === 'RECURRING') {
        if (view) {
          const daysSinceView = (now.getTime() - new Date(view.viewedAt).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceView < update.intervalDays) continue
        }
      }

      // Targeting check
      const targetIds = update.courseIds
        ? update.courseIds.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []

      if (targetIds.length > 0) {
        // Must be enrolled in at least one targeted course
        const hasMatch = targetIds.some((id: string) => enrolledCourseIds.has(id))
        if (!hasMatch) continue
      }
      // If targetIds is empty → global, show to everyone

      pending.push(update)
    }

    return NextResponse.json({
      updates: pending.map(u => ({
        id: u.id,
        title: u.title,
        content: u.content,
        type: u.type,
        imageUrl: u.imageUrl,
        showDelay: u.showDelay,
        priority: u.priority,
        ctaText: u.ctaText,
        ctaLink: u.ctaLink,
        frequency: u.frequency,
        animation: u.animation,
      })),
    })
  } catch (error) {
    console.error('Error fetching pending updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { queueExplicitGoogleGroupSyncJobs } from '@/lib/google-group-sync'

const CRON_SECRET = process.env.CRON_SECRET?.trim()

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    // Look back 3 days to ensure we don't miss anything if a cron job fails
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    // Find courses that expired recently, are not disabled, and have a google group
    const expiredCourses = await prisma.course.findMany({
      where: {
        expiresAt: {
          lte: now,
          gte: threeDaysAgo,
        },
        isDisabled: false, // If it's already disabled, the PUT route would have removed them
        googleGroupEmail: { not: null },
      },
      select: {
        id: true,
        googleGroupEmail: true,
        name: true,
      },
    })

    let totalRemoved = 0

    for (const course of expiredCourses) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id },
        include: { user: { select: { email: true } } },
      })

      if (enrollments.length > 0 && course.googleGroupEmail) {
        const jobs = enrollments.map(e => ({
          userEmail: e.user.email,
          courseId: course.id,
          groupEmail: course.googleGroupEmail as string,
          action: 'REMOVE' as const,
        }))
        
        const count = await queueExplicitGoogleGroupSyncJobs(prisma, jobs)
        totalRemoved += count
        console.log(`[Expiration Sync] Queued ${count} REMOVE jobs for expired course: ${course.name}`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      coursesProcessed: expiredCourses.length,
      jobsQueued: totalRemoved 
    })
  } catch (error) {
    console.error('[Expiration Sync] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

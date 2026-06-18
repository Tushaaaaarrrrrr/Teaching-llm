import { computeDailyAnalytics } from '../lib/lms-analytics'
import { prisma } from '../lib/db'
import { cleanupCourseEnrollmentsIfExpired } from '../lib/expired-course-cleanup'

/**
 * Standalone script to run analytics compute directly from CLI.
 * Used by Render Cron and System Crontab.
 */
async function main() {
  console.log('🚀 Starting daily LMS analytics computation...')
  const start = Date.now()

  try {
    const today = new Date()
    const result = await computeDailyAnalytics(today)

    if (result.success) {
      console.log(`✅ Success! Analytics computed for ${result.date}`)
      console.log('Metrics:', result.metrics)
    } else {
      console.error('❌ Analytics computation failed.')
      process.exit(1)
    }

    console.log('🧹 Running daily cleanup for expired courses...')
    // Find all courses that are expired
    const expiredCourses = await prisma.course.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
      },
    })

    console.log(`Found ${expiredCourses.length} expired courses. Checking for enrollments to clean up...`)
    for (const course of expiredCourses) {
      await prisma.$transaction(async (tx) => {
        const cleaned = await cleanupCourseEnrollmentsIfExpired(tx, course.id)
        if (cleaned) {
          console.log(`🧹 Cleaned up enrollments for expired course: "${course.name}" (${course.id})`)
        }
      })
    }
    console.log('✅ Expired courses cleanup complete.')
  } catch (error) {
    console.error('💥 Fatal error during analytics computation:', error)
    process.exit(1)
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2)
  console.log(`⏱️ Completed in ${duration}s`)
  process.exit(0)
}

main()

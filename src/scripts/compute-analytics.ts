import { computeDailyAnalytics } from '../lib/lms-analytics'

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
  } catch (error) {
    console.error('💥 Fatal error during analytics computation:', error)
    process.exit(1)
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2)
  console.log(`⏱️ Completed in ${duration}s`)
  process.exit(0)
}

main()

import { computeDailyAnalytics } from '../lib/lms-analytics'
import { prisma } from '../lib/db'

async function run() {
  try {
    console.log('Starting manual aggregation of daily analytics...')
    const result = await computeDailyAnalytics(new Date())
    console.log('--- Results ---')
    console.log(JSON.stringify(result, null, 2))
    console.log('\nSuccess! Data precomputed and timer reset.')
  } catch (err) {
    console.error('Error during analytics computation:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()

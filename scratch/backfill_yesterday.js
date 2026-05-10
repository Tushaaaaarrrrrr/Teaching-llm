const { computeDailyAnalytics } = require('../lib/lms-analytics')
async function main() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  console.log('Computing for:', yesterday.toISOString())
  const result = await computeDailyAnalytics(yesterday)
  console.log('Result:', JSON.stringify(result, null, 2))
}
main().catch(console.error)

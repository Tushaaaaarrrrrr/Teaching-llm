const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function safeExec(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log(`  ✅ ${label} succeeded`)
    return true
  } catch (e) {
    console.log(`  ⚠️  ${label}: ${e.meta?.message || e.message}`)
    return false
  }
}

async function main() {
  console.log('Adding lastDailyNotifDate to UpdateSystemSettings table...')
  await safeExec('ALTER TABLE "UpdateSystemSettings" ADD COLUMN IF NOT EXISTS "lastDailyNotifDate" TEXT;', 'lastDailyNotifDate')
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })

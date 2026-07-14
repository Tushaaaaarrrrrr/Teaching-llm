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
  console.log('Adding notification flags to CourseEvent table...')
  await safeExec('ALTER TABLE "CourseEvent" ADD COLUMN IF NOT EXISTS "notified30mBefore" BOOLEAN NOT NULL DEFAULT false;', 'notified30mBefore')
  await safeExec('ALTER TABLE "CourseEvent" ADD COLUMN IF NOT EXISTS "notified10mBefore" BOOLEAN NOT NULL DEFAULT false;', 'notified10mBefore')
  await safeExec('ALTER TABLE "CourseEvent" ADD COLUMN IF NOT EXISTS "notifiedAtStart" BOOLEAN NOT NULL DEFAULT false;', 'notifiedAtStart')
  await safeExec('ALTER TABLE "CourseEvent" ADD COLUMN IF NOT EXISTS "notified10mAfter" BOOLEAN NOT NULL DEFAULT false;', 'notified10mAfter')
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })

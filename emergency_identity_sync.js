/**
 * EMERGENCY IDENTITY SYNC — Adds identity columns to the User table in PostgreSQL
 * 
 * Safe to run multiple times (idempotent).
 * Run with the local database url or standard connection.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function safeExec(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log(`  ✅ ${label}: query execution succeeded`)
    return true
  } catch (e) {
    console.log(`  ⚠️  ${label} failed: ${e.meta?.message || e.message}`)
    return false
  }
}

async function main() {
  console.log('Adding IITM identity columns to User table...')
  
  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "iitmJoinYear" TEXT;`,
    'iitmJoinYear column'
  )
  
  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "iitmJoinMonth" TEXT;`,
    'iitmJoinMonth column'
  )

  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "iitmLevel" TEXT;`,
    'iitmLevel column'
  )

  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "iitmUserType" TEXT;`,
    'iitmUserType column'
  )

  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isIdentityUpdated" BOOLEAN NOT NULL DEFAULT false;`,
    'isIdentityUpdated column'
  )

  console.log('Done.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

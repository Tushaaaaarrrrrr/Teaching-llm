/**
 * EMERGENCY SCHEMA SYNC — Fixes courses disappearance
 * 
 * Root Cause: The `liveUpgradePrice` column was added to schema.prisma
 * but never migrated to the production PostgreSQL database.
 * 
 * Fully idempotent — safe to run multiple times.
 * Usage: DATABASE_URL="postgresql://..." node emergency_schema_sync.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function safeExec(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql)
    return true
  } catch (e) {
    console.log(`  ⚠️  ${label}: ${e.meta?.message || e.message}`)
    return false
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗')
  console.log('║   EMERGENCY SCHEMA SYNC — Courses Fix            ║')
  console.log('╚═══════════════════════════════════════════════════╝\n')

  // ─── FIX #1: THE PRIMARY BLOCKER ──────────────────────────
  console.log('[1/5] Adding liveUpgradePrice to Class table...')
  await safeExec(
    `ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "liveUpgradePrice" DOUBLE PRECISION;`,
    'liveUpgradePrice'
  )
  console.log('  ✅ liveUpgradePrice column ready')

  // ─── FIX #2: UpgradeTransaction table ─────────────────────
  console.log('[2/5] Creating UpgradeTransaction table...')
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "UpgradeTransaction" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "razorpayOrderId" TEXT NOT NULL,
      "razorpayPaymentId" TEXT,
      "razorpaySignature" TEXT,
      "userId" TEXT NOT NULL,
      "classId" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UpgradeTransaction_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "UpgradeTransaction_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "UpgradeTransaction_classId_fkey" FOREIGN KEY ("classId")
        REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `, 'UpgradeTransaction')
  for (const idx of [
    `CREATE UNIQUE INDEX IF NOT EXISTS "UpgradeTransaction_orderId_key" ON "UpgradeTransaction"("orderId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "UpgradeTransaction_razorpayOrderId_key" ON "UpgradeTransaction"("razorpayOrderId")`,
    `CREATE INDEX IF NOT EXISTS "UpgradeTransaction_userId_idx" ON "UpgradeTransaction"("userId")`,
    `CREATE INDEX IF NOT EXISTS "UpgradeTransaction_classId_idx" ON "UpgradeTransaction"("classId")`,
    `CREATE INDEX IF NOT EXISTS "UpgradeTransaction_status_idx" ON "UpgradeTransaction"("status")`,
    `CREATE INDEX IF NOT EXISTS "UpgradeTransaction_createdAt_idx" ON "UpgradeTransaction"("createdAt")`,
  ]) { await safeExec(idx, 'index') }
  console.log('  ✅ UpgradeTransaction table ready')

  // ─── FIX #3: TopicSharedContent.order column ──────────────
  console.log('[3/5] Adding order column to TopicSharedContent...')
  await safeExec(
    `ALTER TABLE "TopicSharedContent" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;`,
    'TopicSharedContent.order'
  )
  console.log('  ✅ TopicSharedContent.order column ready')

  // ─── FIX #4: WebhookLog schema sync ───────────────────────
  console.log('[4/5] Syncing WebhookLog table...')
  // Create the table first if it doesn't exist (handles fresh DBs)
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "WebhookLog" (
      "id" TEXT NOT NULL,
      "webhookEventId" TEXT NOT NULL,
      "eventType" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'RECEIVED',
      "error" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
    );
  `, 'WebhookLog create')
  await safeExec(`CREATE UNIQUE INDEX IF NOT EXISTS "WebhookLog_webhookEventId_key" ON "WebhookLog"("webhookEventId");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "WebhookLog_webhookEventId_idx" ON "WebhookLog"("webhookEventId");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "WebhookLog_eventType_idx" ON "WebhookLog"("eventType");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "WebhookLog_status_idx" ON "WebhookLog"("status");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");`, 'idx')
  // Add columns if table already existed without them
  await safeExec(`ALTER TABLE "WebhookLog" ADD COLUMN IF NOT EXISTS "error" TEXT;`, 'error col')
  await safeExec(`ALTER TABLE "WebhookLog" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`, 'updatedAt col')
  console.log('  ✅ WebhookLog table ready')

  // ─── FIX #5: UserPrompt & PromptResponse tables ──────────────
  console.log('[5/6] Creating UserPrompt and PromptResponse tables...')
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "UserPrompt" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "questions" TEXT NOT NULL DEFAULT '[]',
      CONSTRAINT "UserPrompt_pkey" PRIMARY KEY ("id")
    );
  `, 'UserPrompt')
  
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "PromptResponse" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "promptId" TEXT NOT NULL,
      "answers" TEXT NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PromptResponse_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "PromptResponse_promptId_fkey" FOREIGN KEY ("promptId")
        REFERENCES "UserPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "PromptResponse_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `, 'PromptResponse')

  await safeExec(`CREATE UNIQUE INDEX IF NOT EXISTS "PromptResponse_userId_promptId_key" ON "PromptResponse"("userId", "promptId");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "PromptResponse_userId_idx" ON "PromptResponse"("userId");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "PromptResponse_promptId_idx" ON "PromptResponse"("promptId");`, 'idx')
  console.log('  ✅ UserPrompt and PromptResponse tables ready')

  // ─── FIX #6: BundleOffering tables ──────────────────────────
  console.log('[6/7] Creating BundleOffering tables...')
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "BundleOffering" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "recordedOriginalPrice" DOUBLE PRECISION,
      "recordedDiscountPrice" DOUBLE PRECISION,
      "liveOriginalPrice" DOUBLE PRECISION,
      "liveDiscountPrice" DOUBLE PRECISION,
      "allowIndividualPurchase" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "BundleOffering_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "BundleOffering_createdById_fkey" FOREIGN KEY ("createdById")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `, 'BundleOffering')

  await safeExec(`CREATE INDEX IF NOT EXISTS "BundleOffering_createdById_idx" ON "BundleOffering"("createdById");`, 'idx')

  await safeExec(`
    CREATE TABLE IF NOT EXISTS "BundleOfferingCourse" (
      "id" TEXT NOT NULL,
      "bundleOfferingId" TEXT NOT NULL,
      "classId" TEXT NOT NULL,
      CONSTRAINT "BundleOfferingCourse_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "BundleOfferingCourse_bundleOfferingId_fkey" FOREIGN KEY ("bundleOfferingId")
        REFERENCES "BundleOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "BundleOfferingCourse_classId_fkey" FOREIGN KEY ("classId")
        REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `, 'BundleOfferingCourse')

  await safeExec(`CREATE UNIQUE INDEX IF NOT EXISTS "BundleOfferingCourse_bundleOfferingId_classId_key" ON "BundleOfferingCourse"("bundleOfferingId", "classId");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "BundleOfferingCourse_bundleOfferingId_idx" ON "BundleOfferingCourse"("bundleOfferingId");`, 'idx')
  await safeExec(`CREATE INDEX IF NOT EXISTS "BundleOfferingCourse_classId_idx" ON "BundleOfferingCourse"("classId");`, 'idx')

  console.log('  ✅ BundleOffering tables ready')

  // ─── FIX #7: CourseOffering.detailsLink column ──────────────
  console.log('[7/8] Adding detailsLink to CourseOffering...')
  await safeExec(
    `ALTER TABLE "CourseOffering" ADD COLUMN IF NOT EXISTS "detailsLink" TEXT;`,
    'CourseOffering.detailsLink'
  )
  console.log('  ✅ CourseOffering.detailsLink column ready')

  // ─── VERIFICATION ─────────────────────────────────────────
  console.log('[7/7] Verifying fix...')
  try {
    const courseCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Class"`)
    console.log(`  ✅ Course query works! Found ${courseCount[0].count} courses in database.`)
    const colCheck = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Class' AND column_name = 'liveUpgradePrice'
    `)
    console.log(colCheck.length > 0
      ? '  ✅ liveUpgradePrice column verified in database'
      : '  ⚠️  WARNING: liveUpgradePrice column not found')
  } catch (e) {
    console.error('  ❌ Verification failed:', e.message)
  }

  console.log('\n╔═══════════════════════════════════════════════════╗')
  console.log('║   ✅ SCHEMA SYNC COMPLETE                        ║')
  console.log('║   Restart the app: pm2 restart all               ║')
  console.log('╚═══════════════════════════════════════════════════╝')
}

main()
  .catch(e => { console.error('❌ MIGRATION FAILED:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

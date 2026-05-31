import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    // Only allow logged in MANAGERS to trigger this
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[DevDbInit] Creating tables if they do not exist...')

    // 1. CommunityMutePreference Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CommunityMutePreference" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "classId" TEXT NOT NULL,
        "isMuted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CommunityMutePreference_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CommunityMutePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "CommunityMutePreference_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    console.log('[DevDbInit] CommunityMutePreference table checked.')

    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "CommunityMutePreference_userId_classId_key" 
        ON "CommunityMutePreference"("userId", "classId");
      `)
    } catch {}

    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CommunityMutePreference_userId_idx" ON "CommunityMutePreference"("userId");`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CommunityMutePreference_classId_idx" ON "CommunityMutePreference"("classId");`)
    } catch {}

    // 2. ScheduledUserNotification Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ScheduledUserNotification" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "ctaText" TEXT,
        "ctaLink" TEXT,
        "scheduledFor" TIMESTAMP(3) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ScheduledUserNotification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ScheduledUserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    console.log('[DevDbInit] ScheduledUserNotification table checked.')

    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ScheduledUserNotification_status_idx" ON "ScheduledUserNotification"("status");`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ScheduledUserNotification_scheduledFor_idx" ON "ScheduledUserNotification"("scheduledFor");`)
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Database schema synchronized successfully!',
    })
  } catch (error: any) {
    console.error('[DevDbInit] Error syncing schema:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 })
  }
}

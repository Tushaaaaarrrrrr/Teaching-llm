import { prisma } from '@/lib/db'

const STAGGER_WINDOW_MS = 120_000 // 2 minutes
const JITTER_MS = 5_000 // Random variance up to 5 seconds

export async function queueUsersForSync(excludeUserId: string) {
  try {
    // Get all users except manager who synced
    const users = await prisma.user.findMany({
      select: { id: true },
      where: {
        id: { not: excludeUserId },
        isTerminated: false,
      },
    })

    if (users.length === 0) return

    // Calculate staggered timestamps
    const now = new Date()
    const delayPerUser = STAGGER_WINDOW_MS / Math.max(users.length, 1)

    const queueRecords = users.map((user, index) => {
      const baseDelay = index * delayPerUser
      const randomJitter = Math.random() * JITTER_MS
      const processAt = new Date(now.getTime() + baseDelay + randomJitter)

      return {
        userId: user.id,
        processAt,
      }
    })

    // Batch insert queue records
    await prisma.syncQueue.createMany({
      data: queueRecords,
      skipDuplicates: true,
    })

    console.log(`[Sync Queue] Queued ${users.length} users for sync`)
  } catch (error) {
    console.error('[Sync Queue] Error queuing users:', error)
    throw error
  }
}

export async function processSyncQueue() {
  try {
    const now = new Date()

    // Get all pending sync jobs that are due
    const pendingJobs = await prisma.syncQueue.findMany({
      where: {
        processed: false,
        processAt: { lte: now },
      },
      take: 50, // Process max 50 at a time to prevent overload
    })

    if (pendingJobs.length === 0) {
      return { processed: 0 }
    }

    // Mark jobs as processed once their delayed refresh window has elapsed
    await prisma.$transaction(async (tx) => {
      // Mark jobs as processed
      await (tx as any).syncQueue.updateMany({
        where: {
          id: { in: pendingJobs.map((j) => j.id) },
        },
        data: { processed: true },
      })
    })

    console.log(`[Sync Queue] Processed ${pendingJobs.length} sync jobs at ${now.toISOString()}`)

    return { processed: pendingJobs.length }
  } catch (error) {
    console.error('[Sync Queue] Error processing queue:', error)
    throw error
  }
}

// Cleanup old processed jobs (older than 1 day)
export async function cleanupOldSyncQueue() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const deleted = await prisma.syncQueue.deleteMany({
      where: {
        processed: true,
        createdAt: { lt: oneDayAgo },
      },
    })

    console.log(`[Sync Queue] Cleaned up ${deleted.count} old sync jobs`)

    return deleted.count
  } catch (error) {
    console.error('[Sync Queue] Error cleaning up old jobs:', error)
    throw error
  }
}

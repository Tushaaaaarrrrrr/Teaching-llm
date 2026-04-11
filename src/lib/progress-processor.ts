import { prisma } from '@/lib/db'

export async function processProgressQueue() {
  try {
    // Get all pending progress updates
    const pendingUpdates = await prisma.lectureProgressQueue.findMany({
      where: { processed: false },
      take: 100, // Process in batches
      orderBy: { createdAt: 'asc' }
    })

    if (pendingUpdates.length === 0) {
      return { processed: 0 }
    }

    // Use a transaction to ensure atomic updates
    await prisma.$transaction(async (tx) => {
      for (const update of pendingUpdates) {
        // Upsert into the main LectureProgress table
        await tx.lectureProgress.upsert({
          where: {
            userId_contentId: {
              userId: update.userId,
              contentId: update.contentId,
            }
          },
          update: {
            status: update.status,
          },
          create: {
            userId: update.userId,
            contentId: update.contentId,
            status: update.status,
          }
        })
      }

      // Mark updates as processed
      await tx.lectureProgressQueue.updateMany({
        where: {
          id: { in: pendingUpdates.map(u => u.id) }
        },
        data: { processed: true }
      })
    })

    console.log(`[Progress Processor] Successfully processed ${pendingUpdates.length} updates`)
    return { processed: pendingUpdates.length }
  } catch (error) {
    console.error('[Progress Processor] Error processing queue:', error)
    throw error
  }
}

// Cleanup old processed jobs (older than 7 days)
export async function cleanupOldProgressQueue() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const deleted = await prisma.lectureProgressQueue.deleteMany({
      where: {
        processed: true,
        createdAt: { lt: sevenDaysAgo },
      },
    })

    if (deleted.count > 0) {
      console.log(`[Progress Processor] Cleaned up ${deleted.count} old queue records`)
    }

    return deleted.count
  } catch (error) {
    console.error('[Progress Processor] Error cleaning up queue:', error)
    throw error
  }
}

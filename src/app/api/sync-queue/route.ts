import { NextResponse } from 'next/server'
import { processSyncQueue, cleanupOldSyncQueue } from '@/lib/sync-queue'
import { processProgressQueue, cleanupOldProgressQueue } from '@/lib/progress-processor'
import { processScheduledCampaigns } from '@/lib/campaign-processor'

// This endpoint should be called by a cron job every 10 seconds
// Configure in vercel.json or use an external cron service

export async function POST(req: Request) {
  try {
    // CRON_SECRET is REQUIRED — reject all requests if not configured
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET environment variable is not set. Rejecting request.')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }

    const authToken = req.headers.get('x-cron-secret')
    if (authToken !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process pending sync jobs
    const result = await processSyncQueue()
    
    // Process lecture progress queue
    const progressResult = await processProgressQueue()

    // Process scheduled rich push campaigns
    await processScheduledCampaigns().catch((err) =>
      console.error('[Sync Queue Scheduler] Error processing campaigns:', err)
    )

    // Cleanup old jobs every 10th run (approximately hourly)
    if (Math.random() < 0.1) {
      await cleanupOldSyncQueue()
      await cleanupOldProgressQueue()
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      progressProcessed: progressResult.processed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Sync queue processor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET for monitoring/debugging — also requires auth
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }

    const authToken = req.headers.get('x-cron-secret')
    if (authToken !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      message: 'Sync queue processor is running. Send POST request to process queue.',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

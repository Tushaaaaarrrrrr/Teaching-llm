import { NextResponse } from 'next/server'
import { processSyncQueue, cleanupOldSyncQueue } from '@/lib/sync-queue'

// This endpoint should be called by a cron job every 10 seconds
// Configure in vercel.json or use an external cron service

export async function POST(req: Request) {
  try {
    // Optional: Add auth token verification for security
    const authToken = req.headers.get('x-cron-secret')
    if (process.env.CRON_SECRET && authToken !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process pending sync jobs
    const result = await processSyncQueue()

    // Cleanup old jobs every 10th run (approximately hourly)
    if (Math.random() < 0.1) {
      await cleanupOldSyncQueue()
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Sync queue processor error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// GET for monitoring/debugging
export async function GET(req: Request) {
  try {
    const authToken = req.headers.get('x-cron-secret')
    if (process.env.CRON_SECRET && authToken !== process.env.CRON_SECRET) {
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

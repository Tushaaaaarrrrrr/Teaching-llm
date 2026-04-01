import { NextResponse } from 'next/server'
import { processGoogleGroupSyncJobs } from '@/lib/google-group-sync'

export async function POST(req: Request) {
  console.log("PROCESS API HIT");
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }

    const authToken = req.headers.get('x-cron-secret')
    if (authToken !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processGoogleGroupSyncJobs()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Sync] Google group sync processor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

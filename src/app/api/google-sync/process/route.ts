import { NextResponse } from 'next/server'
import { processGoogleGroupSyncJobs } from '@/lib/google-group-sync'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleRequest(request)
}

export async function POST(request: Request) {
  return handleRequest(request)
}

async function handleRequest(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const secretFromEnv = process.env.CRON_SECRET?.trim()

    if (!secretFromEnv || token !== secretFromEnv) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processGoogleGroupSyncJobs()
    return NextResponse.json({ 
      success: true, 
      ...result 
    })
  } catch (error) {
    console.error('[API process-sync] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 })
  }
}

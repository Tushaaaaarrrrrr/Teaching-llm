import { NextResponse } from 'next/server'
import { computeDailyAnalytics } from '@/lib/lms-analytics'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

/**
 * POST /api/analytics/compute
 *
 * Cron endpoint to precompute daily analytics.
 * Auth: x-cron-secret header (same pattern as /api/sync-queue).
 * Should be called by an external cron service once every 24 hours.
 */
export async function POST(req: Request) {
  try {
    // ─── 1. Validate CRON_SECRET ─────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('[Analytics Cron] CRON_SECRET environment variable is not set. Rejecting request.')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }

    const authToken = req.headers.get('x-cron-secret')
    if (authToken !== cronSecret) {
      // Log unauthorized attempt
      console.error('[Analytics Cron] Unauthorized attempt with invalid secret')
      logActivity({
        userId: 'SYSTEM',
        userName: 'SYSTEM',
        userRole: 'SYSTEM',
        actionType: 'ANALYTICS_CRON_UNAUTHORIZED',
        actionDescription: 'Unauthorized analytics cron attempt — invalid CRON_SECRET',
        moduleName: MODULE.AUTH,
        isFailure: true,
        priority: 2,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. Run aggregation for today ────────────────────────────────
    const today = new Date()
    const result = await computeDailyAnalytics(today)

    // ─── 3. Log success ──────────────────────────────────────────────
    logActivity({
      userId: 'SYSTEM',
      userName: 'SYSTEM',
      userRole: 'SYSTEM',
      actionType: 'ANALYTICS_CRON_SUCCESS',
      actionDescription: `Analytics computed for ${result.date}`,
      moduleName: 'Analytics',
      metadata: result.metrics as Record<string, unknown>,
    })

    return NextResponse.json({
      success: true,
      date: result.date,
      metrics: result.metrics,
      computedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Analytics Cron] Error:', error)

    logActivity({
      userId: 'SYSTEM',
      userName: 'SYSTEM',
      userRole: 'SYSTEM',
      actionType: 'ANALYTICS_CRON_FAILURE',
      actionDescription: `Analytics cron failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      moduleName: 'Analytics',
      isFailure: true,
      priority: 2,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getMaintenanceModeState } from '@/lib/maintenance'
import { getMaintenanceEndTime, isMaintenanceModeActive } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const active = await isMaintenanceModeActive()
    const endsAt = await getMaintenanceEndTime()

    // If active in cache, return immediately to bypass SQL queries
    if (active) {
      return NextResponse.json({ active, endsAt })
    }

    const state = await getMaintenanceModeState()
    return NextResponse.json(state)
  } catch (error) {
    console.error('Error checking maintenance status:', error)
    return NextResponse.json({ active: false, endsAt: null }, { status: 500 })
  }
}

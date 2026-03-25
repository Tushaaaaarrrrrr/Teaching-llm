import { NextResponse } from 'next/server'
import { isMaintenanceModeActive } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const active = await isMaintenanceModeActive()
    return NextResponse.json({ active })
  } catch (error) {
    console.error('Error checking maintenance status:', error)
    return NextResponse.json({ active: false }, { status: 500 })
  }
}

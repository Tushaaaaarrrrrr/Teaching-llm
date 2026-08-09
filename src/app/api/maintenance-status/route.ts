import { NextResponse } from 'next/server'
import { getMaintenanceModeState } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const state = await getMaintenanceModeState()
    return NextResponse.json(state)
  } catch (error) {
    console.error('Error checking maintenance status:', error)
    return NextResponse.json({ active: false }, { status: 500 })
  }
}

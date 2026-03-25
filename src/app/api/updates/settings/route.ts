import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'
import { setMaintenanceMode } from '@/lib/ratelimit'

/**
 * GET /api/updates/settings  - returns global welcomeEnabled / customEnabled
 * PUT /api/updates/settings  - updates global settings
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.updateSystemSettings.upsert({
      where: { id: 'singleton' },
      create: { 
        id: 'singleton', 
        welcomeEnabled: true, 
        customEnabled: true,
        maintenanceMode: false
      },
      update: {},
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching update settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { welcomeEnabled, customEnabled, maintenanceMode } = body

    const settings = await prisma.updateSystemSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        welcomeEnabled: welcomeEnabled ?? true,
        customEnabled: customEnabled ?? true,
        maintenanceMode: maintenanceMode ?? false,
      },
      update: {
        ...(welcomeEnabled !== undefined && { welcomeEnabled }),
        ...(customEnabled !== undefined && { customEnabled }),
        ...(maintenanceMode !== undefined && { maintenanceMode }),
      },
    })

    if (maintenanceMode !== undefined) {
      await setMaintenanceMode(maintenanceMode)
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating update settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

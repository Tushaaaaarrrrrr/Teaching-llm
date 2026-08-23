import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { CURRENT_TOUR_VERSION } from '@/components/tour/tourSteps'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        appTourCompleted: true,
        appTourCompletedAt: true,
        completedTourVersion: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      appTourCompleted: user.appTourCompleted,
      appTourCompletedAt: user.appTourCompletedAt,
      completedTourVersion: user.completedTourVersion,
      currentTourVersion: CURRENT_TOUR_VERSION,
    })
  } catch (error) {
    console.error('Error fetching tour status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch (_) {
      // Empty body is acceptable
    }

    const skipped = Boolean(body.skipped)
    const version = typeof body.version === 'number' ? body.version : CURRENT_TOUR_VERSION

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        appTourCompleted: true,
        appTourCompletedAt: new Date(),
        completedTourVersion: version,
      },
      select: {
        id: true,
        appTourCompleted: true,
        appTourCompletedAt: true,
        completedTourVersion: true,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.PROFILE_UPDATED,
      actionDescription: `${session.name} ${skipped ? 'skipped' : 'completed'} the app tour (v${version})`,
      moduleName: MODULE.PROFILE,
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating tour status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

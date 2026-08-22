import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

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
        deletionRequestedAt: true,
        deletionRequestReason: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasRequested: !!user.deletionRequestedAt,
      deletionRequestedAt: user.deletionRequestedAt,
      deletionRequestReason: user.deletionRequestReason,
    })
  } catch (error: any) {
    console.error('Error fetching deletion request status:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
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
    } catch {
      // Body can be empty
    }

    const agreedToTerms = body?.agreedToTerms === true || body?.agree === true
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null

    if (!agreedToTerms) {
      return NextResponse.json(
        { error: 'You must confirm that you understand the terms before submitting the deletion request.' },
        { status: 400 }
      )
    }

    const now = new Date()

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        deletionRequestedAt: now,
        deletionRequestReason: reason,
      },
      select: {
        id: true,
        name: true,
        email: true,
        deletionRequestedAt: true,
      },
    })

    // Log the user's action in Activity Log
    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.ACCOUNT_DELETION_REQUESTED,
      actionDescription: `User ${session.name} (${session.email}) agreed to deletion terms and requested permanent account deletion`,
      moduleName: MODULE.USER_MGMT,
      priority: 2,
      metadata: {
        agreedToTerms: true,
        deletionRequestedAt: now.toISOString(),
        reason: reason || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Your account deletion request has been submitted. Account deletion may take up to 24 hours to complete.',
      deletionRequestedAt: updatedUser.deletionRequestedAt,
    })
  } catch (error: any) {
    console.error('Error creating account deletion request:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to submit account deletion request' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        deletionRequestedAt: null,
        deletionRequestReason: null,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.ACCOUNT_DELETION_CANCELLED,
      actionDescription: `User ${session.name} (${session.email}) cancelled their pending account deletion request`,
      moduleName: MODULE.USER_MGMT,
      priority: 1,
    })

    return NextResponse.json({
      success: true,
      message: 'Your account deletion request has been cancelled.',
    })
  } catch (error: any) {
    console.error('Error cancelling deletion request:', error)
    return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 })
  }
}

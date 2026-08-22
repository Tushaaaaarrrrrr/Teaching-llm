import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import {
  DELETION_REASONS,
  DELETION_STATUS,
  DELETION_EVENT_TYPE,
  getReasonLabel,
  DeletionReasonCode,
} from '@/lib/deletion-reasons'

/**
 * GET /api/user/delete-request
 * Fetches the active or most recent account deletion request for the current user,
 * including full event history timeline and server-calculated cancellation eligibility.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const latestRequest = await prisma.accountDeletionRequest.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!latestRequest) {
      return NextResponse.json({
        hasRequested: false,
        request: null,
      })
    }

    const now = new Date()
    const isPending = latestRequest.status === DELETION_STATUS.PENDING
    const isCancellationEligible = isPending && now.getTime() < new Date(latestRequest.cancelUntil).getTime()
    const msRemaining = Math.max(0, new Date(latestRequest.cancelUntil).getTime() - now.getTime())

    return NextResponse.json({
      hasRequested: isPending,
      request: {
        id: latestRequest.id,
        status: latestRequest.status,
        reasonCode: latestRequest.reasonCode,
        reasonLabel: latestRequest.reasonLabel,
        userComment: latestRequest.userComment,
        requestedAt: latestRequest.requestedAt,
        cancelUntil: latestRequest.cancelUntil,
        cancelledAt: latestRequest.cancelledAt,
        deletedAt: latestRequest.deletedAt,
        isCancellationEligible,
        msRemaining,
        events: latestRequest.events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          actorType: e.actorType,
          actorName: e.actorName,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching deletion request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/delete-request
 * Creates a new account deletion request with a 24-hour user cancellation window.
 * Requires reasonCode and agreeTerms.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { reasonCode, userComment, agreeTerms } = body

    if (!agreeTerms) {
      return NextResponse.json(
        { error: 'You must confirm that you understand the terms before submitting.' },
        { status: 400 }
      )
    }

    if (!reasonCode || typeof reasonCode !== 'string') {
      return NextResponse.json(
        { error: 'Please select a reason for deleting your account.' },
        { status: 400 }
      )
    }

    const reasonMatch = DELETION_REASONS.find((r) => r.code === reasonCode)
    const reasonLabel = reasonMatch ? reasonMatch.label : getReasonLabel(reasonCode)

    // Sanitize comment and enforce 1000 char limit
    const sanitizedComment = typeof userComment === 'string' && userComment.trim().length > 0
      ? userComment.trim().slice(0, 1000)
      : null

    // Check if an active pending request already exists
    const existingActive = await prisma.accountDeletionRequest.findFirst({
      where: {
        userId: session.userId,
        status: DELETION_STATUS.PENDING,
      },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (existingActive) {
      return NextResponse.json(
        {
          message: 'An active deletion request already exists.',
          request: existingActive,
        },
        { status: 200 }
      )
    }

    // Authoritative server timestamps (exact 24 hours window)
    const requestedAt = new Date()
    const cancelUntil = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the request
      const deletionRequest = await tx.accountDeletionRequest.create({
        data: {
          userId: session.userId,
          userEmail: session.email || 'unknown',
          userName: session.name || 'User',
          reasonCode,
          reasonLabel,
          userComment: sanitizedComment,
          status: DELETION_STATUS.PENDING,
          requestedAt,
          cancelUntil,
        },
      })

      // 2. Create initial timeline event
      await tx.accountDeletionEvent.create({
        data: {
          requestId: deletionRequest.id,
          eventType: DELETION_EVENT_TYPE.ACCOUNT_DELETION_REQUESTED,
          actorType: 'USER',
          actorId: session.userId,
          actorName: session.name || 'User',
          note: `Reason: ${reasonLabel}${sanitizedComment ? ` | Feedback: "${sanitizedComment}"` : ''}`,
          createdAt: requestedAt,
        },
      })

      // 3. Update quick-reference fields on User model
      await tx.user.update({
        where: { id: session.userId },
        data: {
          deletionRequestedAt: requestedAt,
          deletionRequestReason: reasonLabel,
        },
      })

      return deletionRequest
    })

    // 4. Log to global audit trail
    logActivity({
      userId: session.userId,
      userName: session.name || 'User',
      userRole: session.role || 'STUDENT',
      actionType: ACTION.ACCOUNT_DELETION_REQUESTED,
      actionDescription: `${session.name || session.email} submitted account deletion request (Reason: ${reasonLabel})`,
      moduleName: MODULE.USER_MGMT,
      targetId: result.id,
      metadata: {
        requestId: result.id,
        reasonCode,
        reasonLabel,
        hasComment: !!sanitizedComment,
        cancelUntil: cancelUntil.toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Your account deletion request has been submitted.',
      request: {
        ...result,
        msRemaining: cancelUntil.getTime() - requestedAt.getTime(),
        isCancellationEligible: true,
      },
    })
  } catch (error) {
    console.error('Error submitting deletion request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/delete-request
 * User-initiated cancellation of active account deletion request within the 24-hour window.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeRequest = await prisma.accountDeletionRequest.findFirst({
      where: {
        userId: session.userId,
        status: DELETION_STATUS.PENDING,
      },
    })

    if (!activeRequest) {
      return NextResponse.json(
        { error: 'No active deletion request found to cancel.' },
        { status: 404 }
      )
    }

    const now = new Date()
    // Server-authoritative cancellation deadline enforcement
    if (now.getTime() > new Date(activeRequest.cancelUntil).getTime()) {
      return NextResponse.json(
        {
          error: 'The 24-hour cancellation window has expired. Please contact admin@genziitian.org if you need assistance.',
        },
        { status: 400 }
      )
    }

    const cancelledAt = new Date()

    await prisma.$transaction(async (tx) => {
      // 1. Update request status to CANCELLED_BY_USER
      await tx.accountDeletionRequest.update({
        where: { id: activeRequest.id },
        data: {
          status: DELETION_STATUS.CANCELLED_BY_USER,
          cancelledAt,
        },
      })

      // 2. Add cancellation timeline event
      await tx.accountDeletionEvent.create({
        data: {
          requestId: activeRequest.id,
          eventType: DELETION_EVENT_TYPE.ACCOUNT_DELETION_CANCELLED_BY_USER,
          actorType: 'USER',
          actorId: session.userId,
          actorName: session.name || 'User',
          note: 'Deletion request cancelled by user within the 24-hour window.',
          createdAt: cancelledAt,
        },
      })

      // 3. Clear user active deletion flag
      await tx.user.update({
        where: { id: session.userId },
        data: {
          deletionRequestedAt: null,
          deletionRequestReason: null,
        },
      })
    })

    // 4. Log to audit trail
    logActivity({
      userId: session.userId,
      userName: session.name || 'User',
      userRole: session.role || 'STUDENT',
      actionType: ACTION.ACCOUNT_DELETION_CANCELLED,
      actionDescription: `${session.name || session.email} cancelled their account deletion request.`,
      moduleName: MODULE.USER_MGMT,
      targetId: activeRequest.id,
      metadata: { requestId: activeRequest.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Account deletion request cancelled. Your account remains active.',
    })
  } catch (error) {
    console.error('Error cancelling deletion request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

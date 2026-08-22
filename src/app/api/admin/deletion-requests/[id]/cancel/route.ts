import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { DELETION_STATUS, DELETION_EVENT_TYPE } from '@/lib/deletion-reasons'

/**
 * POST /api/admin/deletion-requests/[id]/cancel
 * Allows a Manager to cancel any active deletion request at any time,
 * restoring the user account and appending a manager cancellation event to the timeline.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized — Managers only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { note } = body

    const deletionRequest = await prisma.accountDeletionRequest.findUnique({
      where: { id },
    })

    if (!deletionRequest) {
      return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 })
    }

    if (
      deletionRequest.status === DELETION_STATUS.CANCELLED_BY_USER ||
      deletionRequest.status === DELETION_STATUS.CANCELLED_BY_MANAGER ||
      deletionRequest.status === DELETION_STATUS.DELETED
    ) {
      return NextResponse.json(
        { error: `Cannot cancel a request with status: ${deletionRequest.status}` },
        { status: 400 }
      )
    }

    const cancelledAt = new Date()
    const customNote = note ? String(note).trim().slice(0, 500) : null
    const noteText = customNote
      ? `Cancelled by Manager (${session.name}): "${customNote}"`
      : `Cancelled by Manager (${session.name}). User account restored.`

    await prisma.$transaction(async (tx) => {
      // 1. Update request status
      await tx.accountDeletionRequest.update({
        where: { id },
        data: {
          status: DELETION_STATUS.CANCELLED_BY_MANAGER,
          cancelledAt,
        },
      })

      // 2. Append timeline event
      await tx.accountDeletionEvent.create({
        data: {
          requestId: id,
          eventType: DELETION_EVENT_TYPE.ACCOUNT_DELETION_CANCELLED_BY_MANAGER,
          actorType: 'MANAGER',
          actorId: session.userId,
          actorName: session.name || 'Manager',
          note: noteText,
          createdAt: cancelledAt,
        },
      })

      // 3. Clear user active deletion flag
      await tx.user.update({
        where: { id: deletionRequest.userId },
        data: {
          deletionRequestedAt: null,
          deletionRequestReason: null,
        },
      })
    })

    // 4. Log to global audit trail
    logActivity({
      userId: session.userId,
      userName: session.name || 'Manager',
      userRole: session.role || 'MANAGER',
      actionType: ACTION.ACCOUNT_DELETION_CANCELLED,
      actionDescription: `${session.name} cancelled deletion request for user ${deletionRequest.userName} (${deletionRequest.userEmail})`,
      moduleName: MODULE.USER_MGMT,
      targetId: deletionRequest.userId,
      metadata: { requestId: id, note: customNote },
    })

    return NextResponse.json({
      success: true,
      message: 'Deletion request cancelled successfully. User account is active.',
    })
  } catch (error) {
    console.error('Error in manager cancel deletion request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

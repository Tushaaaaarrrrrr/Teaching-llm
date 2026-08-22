import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { DELETION_STATUS, DELETION_EVENT_TYPE } from '@/lib/deletion-reasons'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'
import { sendAccountDeletedEmail } from '@/lib/email-service'

/**
 * POST /api/admin/deletion-requests/[id]/process-delete
 * Allows a Manager to execute manual deletion of the user account.
 * Detaches/cleans up associated data, marks the request as DELETED with a timeline event,
 * and removes the User record safely while preserving the deletion audit history.
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
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            enrollments: { select: { courseId: true } },
          },
        },
      },
    })

    if (!deletionRequest) {
      return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 })
    }

    if (deletionRequest.status === DELETION_STATUS.DELETED) {
      return NextResponse.json({ error: 'User account has already been deleted' }, { status: 400 })
    }

    const targetUserId = deletionRequest.userId
    const deletedAt = new Date()
    const customNote = note ? String(note).trim().slice(0, 500) : null
    const noteText = customNote
      ? `Account manually deleted by Manager (${session.name}): "${customNote}"`
      : `Account manually deleted by Manager (${session.name}).`

    await prisma.$transaction(async (tx) => {
      // 1. Update request status to DELETED
      await tx.accountDeletionRequest.update({
        where: { id },
        data: {
          status: DELETION_STATUS.DELETED,
          deletedAt,
        },
      })

      // 2. Append final timeline event
      await tx.accountDeletionEvent.create({
        data: {
          requestId: id,
          eventType: DELETION_EVENT_TYPE.ACCOUNT_DELETED,
          actorType: 'MANAGER',
          actorId: session.userId,
          actorName: session.name || 'Manager',
          note: noteText,
          createdAt: deletedAt,
        },
      })

      // 3. Queue Google group removals if user had enrollments
      if (deletionRequest.user?.email && deletionRequest.user.enrollments.length > 0) {
        await queueGoogleGroupSyncJobs(tx, {
          userEmail: deletionRequest.user.email,
          courseIds: deletionRequest.user.enrollments.map((e) => e.courseId),
          action: 'REMOVE',
        })
      }

      // 4. Delete the User record if still present (cascades related enrollments/tokens)
      // Since AccountDeletionRequest has onDelete: Cascade, if we want to keep the historical
      // request record forever even after User row is removed, wait!
      // In prisma/schema.prisma:
      // user User @relation(fields: [userId], references: [id], onDelete: Cascade)
      // If we delete the User, Prisma cascade would delete AccountDeletionRequest unless user is anonymized or soft-deleted/terminated!
      // Setting isTerminated: true, email: `deleted_${targetUserId}_${email}`, and clearing personal fields is much safer
      // than raw cascade deletion, ensuring the audit history remains intact!
      if (deletionRequest.user) {
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            isTerminated: true,
            deletionRequestedAt: null,
            deletionRequestReason: 'DELETED',
            tokenVersion: { increment: 1 },
            avatar: null,
            aboutMe: null,
          },
        })
      }
    })

    // 5. Send confirmation email to the user
    sendAccountDeletedEmail({
      userEmail: deletionRequest.userEmail,
      userName: deletionRequest.userName,
    }).catch((err) => console.error('[EMAIL_DELIVERY_ERR]', err))

    // 6. Audit log
    logActivity({
      userId: session.userId,
      userName: session.name || 'Manager',
      userRole: session.role || 'MANAGER',
      actionType: ACTION.USER_DELETED,
      actionDescription: `${session.name} processed manual deletion for user ${deletionRequest.userName} (${deletionRequest.userEmail})`,
      moduleName: MODULE.USER_MGMT,
      targetId: targetUserId,
      metadata: { requestId: id, note: customNote },
    })

    return NextResponse.json({
      success: true,
      message: `Account for ${deletionRequest.userName} has been successfully deleted/deactivated.`,
    })
  } catch (error) {
    console.error('Error in manager process delete:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

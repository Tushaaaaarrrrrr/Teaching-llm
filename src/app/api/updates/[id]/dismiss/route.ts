import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

/**
 * POST /api/updates/[id]/dismiss
 * Marks an update as viewed by the current user.
 * Also handles welcome updates by setting hasSeenWelcome.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updateId = params.id
    const userId = session.userId

    // Verify the update exists
    const update = await prisma.systemUpdate.findUnique({
      where: { id: updateId },
      select: { id: true, type: true, title: true },
    })

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    // Create view record (upsert to handle duplicates)
    await prisma.updateView.upsert({
      where: {
        updateId_userId: { updateId, userId },
      },
      create: { updateId, userId },
      update: {},
    })

    // If this is a welcome update, also mark hasSeenWelcome
    if (update.type === 'WELCOME') {
      await prisma.user.update({
        where: { id: userId },
        data: { hasSeenWelcome: true },
      })
    }

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.UPDATE_VIEWED,
      actionDescription: `Viewed ${update.type} message: ${update.title}`,
      moduleName: MODULE.UPDATES,
      targetId: update.id,
      priority: 0,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error dismissing update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

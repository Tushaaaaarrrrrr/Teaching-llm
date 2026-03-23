import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

/**
 * POST /api/updates/[id]/dismiss
 * Marks an update as viewed by the current user.
 * - WELCOME: sets hasSeenWelcome = true
 * - CUSTOM ONCE: creates UpdateView (never shows again)
 * - CUSTOM RECURRING: upserts UpdateView with fresh viewedAt (controls the interval)
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

    const update = await prisma.systemUpdate.findUnique({
      where: { id: updateId },
      select: { id: true, type: true, frequency: true, title: true },
    })

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    if (update.type === 'WELCOME') {
      // Mark welcome as seen + record view
      await Promise.all([
        prisma.user.update({ where: { id: userId }, data: { hasSeenWelcome: true } }),
        prisma.updateView.upsert({
          where: { updateId_userId: { updateId, userId } },
          create: { updateId, userId },
          update: { viewedAt: new Date() },
        }),
      ])
    } else if (update.frequency === 'RECURRING') {
      // Upsert with updated timestamp so interval restarts
      await prisma.updateView.upsert({
        where: { updateId_userId: { updateId, userId } },
        create: { updateId, userId },
        update: { viewedAt: new Date() },
      })
    } else {
      // ONCE: just record once
      await prisma.updateView.upsert({
        where: { updateId_userId: { updateId, userId } },
        create: { updateId, userId },
        update: {},
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

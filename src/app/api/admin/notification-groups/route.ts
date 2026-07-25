import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getNotificationGroupPoolStats,
  addNotificationGroupToPool,
  flushNotificationGroupOverflowQueue,
  addNotificationGroupToUser,
  removeNotificationGroupFromUser,
  assignAllUsersToNotificationGroup,
} from '@/lib/notification-group-pool'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Manager access required.' }, { status: 403 })
    }

    const stats = await getNotificationGroupPoolStats(prisma)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    console.error('[API Notification Groups GET] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Manager access required.' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'ADD_POOL') {
      const { groupEmail, maxCapacity } = body
      if (!groupEmail) {
        return NextResponse.json({ error: 'groupEmail is required' }, { status: 400 })
      }

      const result = await addNotificationGroupToPool(prisma, groupEmail, maxCapacity ? Number(maxCapacity) : 500)
      return NextResponse.json({ success: true, message: 'Notification Group added to pool successfully', ...result })
    }

    if (action === 'FLUSH_QUEUE') {
      const result = await flushNotificationGroupOverflowQueue(prisma)
      return NextResponse.json({ success: true, message: 'Overflow queue processed', ...result })
    }

    if (action === 'TOGGLE_STATUS') {
      const { poolId, isActive } = body
      if (!poolId) {
        return NextResponse.json({ error: 'poolId is required' }, { status: 400 })
      }

      const updated = await prisma.notificationGroupPool.update({
        where: { id: poolId },
        data: { isActive: Boolean(isActive) },
      })

      // If re-activating, attempt to flush queue
      if (isActive) {
        await flushNotificationGroupOverflowQueue(prisma)
      }

      return NextResponse.json({ success: true, pool: updated })
    }

    if (action === 'ADD_USER_GROUP') {
      const { userId, groupEmail } = body
      if (!userId || !groupEmail) {
        return NextResponse.json({ error: 'userId and groupEmail are required' }, { status: 400 })
      }

      const result = await addNotificationGroupToUser(prisma, userId, groupEmail)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'REMOVE_USER_GROUP') {
      const { userId, groupEmail } = body
      if (!userId || !groupEmail) {
        return NextResponse.json({ error: 'userId and groupEmail are required' }, { status: 400 })
      }

      const result = await removeNotificationGroupFromUser(prisma, userId, groupEmail)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'ASSIGN_ALL') {
      const { groupEmail } = body // If undefined, triggers auto-distribution of unassigned users
      const result = await assignAllUsersToNotificationGroup(prisma, groupEmail)
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('[API Notification Groups POST] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

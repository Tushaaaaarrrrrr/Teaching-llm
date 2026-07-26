import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getPoolCategoryStats,
  createPoolCategory,
  addEmailToPoolCategory,
  flushCategoryOverflowQueue,
  assignAllUsersToPoolCategory,
  cleanupDuplicatePoolAssignments,
} from '@/lib/notification-group-pool'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Manager access required.' }, { status: 403 })
    }

    const stats = await getPoolCategoryStats(prisma)
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

    if (action === 'CREATE_CATEGORY') {
      const { name, description, isDefault } = body
      if (!name) {
        return NextResponse.json({ error: 'Pool Category Name is required' }, { status: 400 })
      }

      const category = await createPoolCategory(prisma, name, description, Boolean(isDefault))
      return NextResponse.json({ success: true, message: 'Pool Group created successfully', category })
    }

    if (action === 'ADD_EMAIL_TO_CATEGORY') {
      const { categoryId, groupEmail, maxCapacity } = body
      if (!categoryId || !groupEmail) {
        return NextResponse.json({ error: 'categoryId and groupEmail are required' }, { status: 400 })
      }

      const result = await addEmailToPoolCategory(prisma, categoryId, groupEmail, maxCapacity ? Number(maxCapacity) : 500)
      return NextResponse.json({ success: true, message: 'Group Email added to Pool successfully', ...result })
    }

    if (action === 'FLUSH_CATEGORY') {
      const { categoryId } = body
      if (!categoryId) {
        return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
      }

      const result = await flushCategoryOverflowQueue(prisma, categoryId)
      return NextResponse.json({ success: true, message: 'Category queue processed', ...result })
    }

    if (action === 'TOGGLE_EMAIL_STATUS') {
      const { emailId, isActive } = body
      if (!emailId) {
        return NextResponse.json({ error: 'emailId is required' }, { status: 400 })
      }

      const updated = await prisma.notificationPoolEmail.update({
        where: { id: emailId },
        data: { isActive: Boolean(isActive) },
      })

      if (isActive) {
        await flushCategoryOverflowQueue(prisma, updated.categoryId)
      }

      return NextResponse.json({ success: true, email: updated })
    }

    if (action === 'ASSIGN_ALL_CATEGORY') {
      const { categoryId } = body // If undefined, uses default category
      const result = await assignAllUsersToPoolCategory(prisma, categoryId)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'CLEANUP_DUPLICATES') {
      const result = await cleanupDuplicatePoolAssignments(prisma)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'DELETE_CATEGORY') {
      const { categoryId } = body
      if (!categoryId) {
        return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
      }

      await prisma.notificationPoolCategory.delete({
        where: { id: categoryId },
      })

      return NextResponse.json({ success: true, message: 'Pool Category deleted successfully' })
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

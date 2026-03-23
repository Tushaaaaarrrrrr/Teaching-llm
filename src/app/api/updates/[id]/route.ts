import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title, content, type, imageUrl, isActive, priority,
      showDelay, frequency, intervalDays, courseIds,
      ctaText, ctaLink, startDate, endDate, animation,
    } = body

    const existing = await prisma.systemUpdate.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    const update = await prisma.systemUpdate.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(type !== undefined && { type }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
        ...(showDelay !== undefined && { showDelay }),
        ...(frequency !== undefined && { frequency }),
        ...(intervalDays !== undefined && { intervalDays }),
        ...(courseIds !== undefined && { courseIds: Array.isArray(courseIds) ? courseIds.join(',') : (courseIds || '') }),
        ...(ctaText !== undefined && { ctaText: ctaText || null }),
        ...(ctaLink !== undefined && { ctaLink: ctaLink || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(animation !== undefined && { animation: animation || null }),
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.UPDATE_UPDATED,
      actionDescription: `Updated ${update.type} message: ${update.title}`,
      moduleName: MODULE.UPDATES,
      targetId: update.id,
      priority: 1,
    })

    return NextResponse.json({ update })
  } catch (error) {
    console.error('Error updating update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.systemUpdate.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    await prisma.systemUpdate.delete({ where: { id: params.id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.UPDATE_DELETED,
      actionDescription: `Deleted update: ${existing.title}`,
      moduleName: MODULE.UPDATES,
      targetId: params.id,
      priority: 1,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

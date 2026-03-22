import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'

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
      animationType, showDelay, targetRole, scheduledAt, expiresAt,
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
        ...(animationType !== undefined && { animationType: animationType || null }),
        ...(showDelay !== undefined && { showDelay }),
        ...(targetRole !== undefined && { targetRole: targetRole || null }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
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

    await prisma.systemUpdate.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

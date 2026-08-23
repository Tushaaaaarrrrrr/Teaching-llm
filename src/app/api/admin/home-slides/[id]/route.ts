import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const slide = await prisma.homeSlide.update({
      where: { id: params.id },
      data: {
        ...(typeof body.image === 'string' && { image: body.image }),
        ...(typeof body.alt === 'string' && { alt: body.alt }),
        ...(typeof body.href === 'string' && { href: body.href }),
        ...(typeof body.order === 'number' && { order: body.order }),
        ...(typeof body.isActive === 'boolean' && { isActive: body.isActive }),
      },
    })

    return NextResponse.json(slide)
  } catch (error) {
    console.error('Error updating home slide:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE: Remove a carousel banner by ID.
 * Restricted to Managers/Admins.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Slide ID is required' }, { status: 400 })
    }

    await prisma.homeSlide.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Slide deleted successfully' })
  } catch (error) {
    console.error('Error deleting home slide:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

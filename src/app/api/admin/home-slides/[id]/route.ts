import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

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

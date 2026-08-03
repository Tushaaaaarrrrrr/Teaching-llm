import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

// GET: Get a single test series with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testSeries = await (prisma as any).testSeries.findUnique({
      where: { id: params.id },
      include: {
        exams: {
          include: {
            _count: { select: { questions: true, attempts: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { accesses: true } },
        createdBy: { select: { id: true, name: true } }
      }
    })

    if (!testSeries) {
      return NextResponse.json({ error: 'Test series not found' }, { status: 404 })
    }

    return NextResponse.json({ testSeries })
  } catch (error: any) {
    console.error('Error fetching test series:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Update a test series
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, price, originalPrice, validityDays, isActive, category } = await request.json()

    const testSeries = await (prisma as any).testSeries.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) || 0 }),
        ...(originalPrice !== undefined && { originalPrice: originalPrice ? parseFloat(originalPrice) : null }),
        ...(validityDays !== undefined && { validityDays: parseInt(validityDays) || 365 }),
        ...(isActive !== undefined && { isActive }),
        ...(category !== undefined && { category })
      },
      include: {
        _count: { select: { exams: true } },
        createdBy: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({ testSeries })
  } catch (error: any) {
    console.error('Error updating test series:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Delete a test series
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await (prisma as any).testSeries.delete({
      where: { id: params.id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('Error deleting test series:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

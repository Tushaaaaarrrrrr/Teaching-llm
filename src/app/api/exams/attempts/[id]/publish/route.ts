import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // attemptId
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { isPublished } = await request.json()

    const updatedAttempt = await (prisma.examAttempt as any).update({
      where: { id },
      data: { isPublished: !!isPublished }
    })

    return NextResponse.json(updatedAttempt)
  } catch (error) {
    console.error('Error publishing attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const liveSession = await prisma.liveSession.findUnique({
      where: { id },
      include: {
        class: true,
      },
    })

    if (!liveSession) {
      return NextResponse.json({ error: 'Live session not found' }, { status: 404 })
    }

    return NextResponse.json(liveSession)
  } catch (error) {
    console.error('Error fetching live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { classId, title, description, meetingLink, instructor, date, time, status } =
      await request.json()

    const updatedSession = await prisma.liveSession.update({
      where: { id },
      data: { classId, title, description, meetingLink, instructor, date, time, status },
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.liveSession.delete({ where: { id } })

    return NextResponse.json({ message: 'Live session deleted successfully' })
  } catch (error) {
    console.error('Error deleting live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

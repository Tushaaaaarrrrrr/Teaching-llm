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

    const lecture = await prisma.lecture.findUnique({
      where: { id },
      include: {
        class: true,
        uploadedBy: { select: { name: true } },
      },
    })

    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    return NextResponse.json(lecture)
  } catch (error) {
    console.error('Error fetching lecture:', error)
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
    const { classId, title, description, videoUrl, notesUrl, duration, thumbnail } =
      await request.json()

    const updatedLecture = await prisma.lecture.update({
      where: { id },
      data: { classId, title, description, videoUrl, notesUrl, duration, thumbnail },
    })

    return NextResponse.json(updatedLecture)
  } catch (error) {
    console.error('Error updating lecture:', error)
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

    await prisma.lecture.delete({ where: { id } })

    return NextResponse.json({ message: 'Lecture deleted successfully' })
  } catch (error) {
    console.error('Error deleting lecture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent, isInstructor, getInstructorClassIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

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

    if (!canManageContent(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { classId, title, description, videoUrl, notesUrl, duration, thumbnail } =
      await request.json()

    // Instructor: can only edit lectures in assigned classes
    if (isInstructor(session.role)) {
      const lecture = await prisma.lecture.findUnique({ where: { id }, select: { classId: true } })
      if (!lecture) return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
      const assignedIds = await getInstructorClassIds(session.userId)
      if (!assignedIds.includes(lecture.classId)) {
        return NextResponse.json({ error: 'You are not assigned to this subject' }, { status: 403 })
      }
    }

    const updatedLecture = await prisma.lecture.update({
      where: { id },
      data: { classId, title, description, videoUrl, notesUrl, duration, thumbnail },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.LECTURE_UPDATED,
      actionDescription: `${session.name} updated lecture "${updatedLecture.title}"`,
      moduleName: MODULE.LECTURES,
      targetId: id,
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

    if (!canManageContent(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Instructor: can only delete lectures in assigned classes
    if (isInstructor(session.role)) {
      const lecture = await prisma.lecture.findUnique({ where: { id }, select: { classId: true } })
      if (!lecture) return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
      const assignedIds = await getInstructorClassIds(session.userId)
      if (!assignedIds.includes(lecture.classId)) {
        return NextResponse.json({ error: 'You are not assigned to this subject' }, { status: 403 })
      }
    }

    const existing = await prisma.lecture.findUnique({ where: { id }, select: { title: true } })

    await prisma.lecture.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.LECTURE_DELETED,
      actionDescription: `${session.name} deleted lecture "${existing?.title}"`,
      moduleName: MODULE.LECTURES,
      targetId: id,
    })

    return NextResponse.json({ message: 'Lecture deleted successfully' })
  } catch (error) {
    console.error('Error deleting lecture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

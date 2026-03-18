import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent, isInstructor, getInstructorCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Instructor: verify content belongs to an assigned course
    if (isInstructor(session.role)) {
      const content = await prisma.content.findUnique({
        where: { id },
        select: { topic: { select: { courseId: true } } },
      })
      if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      const assignedIds = await getInstructorCourseIds(session.userId)
      if (!assignedIds.includes(content.topic.courseId)) {
        return NextResponse.json({ error: 'You are not assigned to this course' }, { status: 403 })
      }
    }

    const { title, description, videoUrl, videoSource, pptUrl } = await request.json()

    const content = await prisma.content.update({
      where: { id },
      data: { title, description, videoUrl, videoSource, pptUrl },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CONTENT_UPDATED,
      actionDescription: `${session.name} updated content "${content.title}"`,
      moduleName: MODULE.CONTENT,
      targetId: id,
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Instructor: verify content belongs to an assigned course
    if (isInstructor(session.role)) {
      const content = await prisma.content.findUnique({
        where: { id },
        select: { topic: { select: { courseId: true } } },
      })
      if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      const assignedIds = await getInstructorCourseIds(session.userId)
      if (!assignedIds.includes(content.topic.courseId)) {
        return NextResponse.json({ error: 'You are not assigned to this course' }, { status: 403 })
      }
    }

    const existing = await prisma.content.findUnique({ where: { id }, select: { title: true } })
    await prisma.content.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CONTENT_DELETED,
      actionDescription: `${session.name} deleted content "${existing?.title}"`,
      moduleName: MODULE.CONTENT,
      targetId: id,
    })

    return NextResponse.json({ message: 'Content deleted' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

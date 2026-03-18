import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent, isInstructor, getInstructorCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Instructor: verify topic belongs to an assigned course
    if (isInstructor(session.role)) {
      const topic = await prisma.topic.findUnique({ where: { id }, select: { courseId: true } })
      if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
      const assignedIds = await getInstructorCourseIds(session.userId)
      if (!assignedIds.includes(topic.courseId)) {
        return NextResponse.json({ error: 'You are not assigned to this course' }, { status: 403 })
      }
    }

    const { title, description, videoUrl, videoSource, pptUrl } = await request.json()

    const count = await prisma.content.count({ where: { topicId: id } })
    const content = await prisma.content.create({
      data: { topicId: id, title, description, videoUrl, videoSource: videoSource || 'YOUTUBE', pptUrl, order: count },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CONTENT_CREATED,
      actionDescription: `${session.name} created content "${title}"`,
      moduleName: MODULE.CONTENT,
      targetId: content.id,
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

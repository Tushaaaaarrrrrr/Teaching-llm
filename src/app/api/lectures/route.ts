import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent, isInstructor, getInstructorCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const where = courseId ? { courseId } : {}

    const lectures = await prisma.lecture.findMany({
      where,
      include: {
        course: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(lectures)
  } catch (error) {
    console.error('Error fetching lectures:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageContent(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { courseId, title, description, videoUrl, notesUrl, duration, thumbnail } =
      await request.json()

    // Instructor: can only create lectures in assigned courses
    if (isInstructor(session.role)) {
      const assignedIds = await getInstructorCourseIds(session.userId)
      if (!assignedIds.includes(courseId)) {
        return NextResponse.json({ error: 'You are not assigned to this course' }, { status: 403 })
      }
    }

    const lecture = await prisma.lecture.create({
      data: {
        courseId,
        title,
        description,
        videoUrl,
        notesUrl,
        duration,
        thumbnail,
        uploadedById: session.userId,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.LECTURE_CREATED,
      actionDescription: `${session.name} created lecture "${title}"`,
      moduleName: MODULE.LECTURES,
      targetId: lecture.id,
    })

    return NextResponse.json(lecture, { status: 201 })
  } catch (error) {
    console.error('Error creating lecture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

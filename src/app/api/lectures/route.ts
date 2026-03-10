import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    const where = classId ? { classId } : {}

    const lectures = await prisma.lecture.findMany({
      where,
      include: {
        class: { select: { name: true } },
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

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { classId, title, description, videoUrl, notesUrl, duration, thumbnail } =
      await request.json()

    const lecture = await prisma.lecture.create({
      data: {
        classId,
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

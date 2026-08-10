import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const requestedCourseId = request.nextUrl.searchParams.get('courseId')

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            course: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    })

    if (!content) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    // Course Access Control: Check enrollment for students
    let isDemoUser = false
    let accessCourseId = content.topic?.course?.id
    let courseContext = content.topic?.course ?? null
    if (session.role === 'STUDENT') {
      if (requestedCourseId && requestedCourseId !== accessCourseId) {
        const sharedContentContext = await prisma.topicSharedContent.findFirst({
          where: {
            contentId: id,
            topic: { courseId: requestedCourseId },
          },
          select: {
            topic: {
              select: {
                course: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        })

        if (sharedContentContext?.topic?.course) {
          accessCourseId = sharedContentContext.topic.course.id
          courseContext = sharedContentContext.topic.course
        }
      }

      if (accessCourseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: session.userId,
              courseId: accessCourseId,
            },
          },
        })

        if (!enrollment) {
          return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
        }
        if (enrollment.type === 'DEMO') {
          isDemoUser = true
        }
      }
    }

    const responseContent = courseContext && courseContext.id !== content.topic?.course?.id
      ? {
          ...content,
          topic: content.topic
            ? {
                ...content.topic,
                course: courseContext,
              }
            : content.topic,
        }
      : content

    if (isDemoUser && !content.isDemo) {
      return NextResponse.json({
        ...responseContent,
        isDemoLocked: true,
        videoUrl: null,
        youtubeUrl: null,
        pptUrl: null,
        videoVariants: null,
      })
    }

    return NextResponse.json({
      ...responseContent,
      isDemoLocked: false
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const { title, description, videoUrl, youtubeUrl, pptUrl, videoSource, isDemo, duration } = await request.json()

    const content = await prisma.content.update({
      where: { id },
      data: {
        title,
        description,
        videoUrl,
        youtubeUrl,
        pptUrl,
        videoSource,
        isDemo: isDemo !== undefined ? !!isDemo : undefined,
        duration: duration !== undefined ? (duration || null) : undefined,
      },
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
    const body = await request.json().catch(() => null)
    const topicId = body?.topicId as string | undefined
    const forceDelete = Boolean(body?.forceDelete)

    const existing = await (prisma.content.findUnique as any)({
      where: { id },
      select: {
        title: true,
        topicId: true,
        videoUrl: true,
        isRecordingOnly: true,
        sharedTopics: {
          select: { id: true, topicId: true },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    if (forceDelete) {
      await prisma.content.delete({ where: { id } })

      logActivity({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        actionType: ACTION.CONTENT_DELETED,
        actionDescription: `${session.name} permanently deleted recording "${existing.title}"`,
        moduleName: MODULE.CONTENT,
        targetId: id,
      })

      return NextResponse.json({ message: 'Recording deleted permanently' })
    }

    if (topicId && existing.topicId !== topicId) {
      await prisma.topicSharedContent.deleteMany({ where: { topicId, contentId: id } })
      return NextResponse.json({ message: 'Lecture removed from this topic' })
    }

    if (topicId && existing.topicId === topicId && existing.videoUrl) {
      await (prisma.content.update as any)({
        where: { id },
        data: { isRecordingOnly: true },
      })
      return NextResponse.json({ message: 'Lecture removed from this course and kept in recordings' })
    }

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

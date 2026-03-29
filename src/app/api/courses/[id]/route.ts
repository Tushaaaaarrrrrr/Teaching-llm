import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { isCourseEffectivelyDisabled, isCourseExpired } from '@/lib/course-state'

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

    const courseState = await (prisma.course.findUnique as any)({
      where: { id },
      select: { id: true, isDisabled: true, expiresAt: true },
    })

    if (!courseState) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (isCourseEffectivelyDisabled(courseState) && !isManager(session.role)) {
      return NextResponse.json({ error: 'Course is currently disabled' }, { status: 403 })
    }

    if (!isAdminOrManager(session.role)) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.userId,
            courseId: id,
          },
        },
      })

      if (!enrollment) {
        return NextResponse.json({ error: 'Access denied. You are not enrolled in this course.' }, { status: 403 })
      }
    }

    const courseData = await prisma.course.findUnique({
      where: { id },
      include: {
        lectures: {
          include: { uploadedBy: { select: { name: true } } },
          orderBy: { uploadedAt: 'desc' },
        },
        materials: {
          orderBy: { uploadedAt: 'desc' },
        },
        courseEvents: {
          where: { status: { not: 'CANCELLED' } },
          include: { instructor: { select: { name: true } } },
          orderBy: { startTime: 'asc' },
        },
        topics: {
          include: {
            content: {
              select: {
                videoUrl: true,
                pptUrl: true,
              },
            },
          },
        },
        createdBy: { select: { name: true } },
        _count: {
          select: {
            courseEvents: true,
          },
        },
      },
    })

    if (!courseData) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Calculate dynamic counts
    const cData = courseData as any
    const topicsCount = cData.topics.length
    let lecturesCount = 0
    let materialsCount = 0

    cData.topics.forEach((topic: any) => {
      topic.content.forEach((content: any) => {
        if (content.videoUrl) lecturesCount++
        if (content.pptUrl) materialsCount++
      })
    })

    const result = {
      ...cData,
      isExpired: isCourseExpired(cData),
      isEffectivelyDisabled: isCourseEffectivelyDisabled(cData),
      _count: {
        ...cData._count,
        topics: topicsCount,
        lectures: lecturesCount,
        materials: materialsCount,
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching course:', error)
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
    const { name, description, subject, color, icon, expiresAt, teacherName, isCommunityActive, isDisabled } = await request.json()

    if (isDisabled !== undefined && !isManager(session.role)) {
      return NextResponse.json({ error: 'Only managers can enable or disable courses' }, { status: 403 })
    }

    const existingCourse = await (prisma.course.findUnique as any)({ where: { id } })
    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Validate expiresAt if provided
    if (expiresAt) {
      const expiryDate = new Date(expiresAt)
      if (expiryDate.toString() === 'Invalid Date') {
        return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 })
      }
      if (expiryDate <= new Date() && !existingCourse.expiresAt) {
        return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 })
      }
    }

    // Demo state and Free state are immutable on edit.

    const updatedCourse = await (prisma.course.update as any)({
      where: { id },
      data: { 
        name, 
        description, 
        subject, 
        color, 
        icon,
        teacherName: teacherName || null,
        isDemo: existingCourse.isDemo, // Never change on update
        isFree: existingCourse.isFree, // Never change on update
        isCommunityActive: isCommunityActive !== undefined ? !!isCommunityActive : undefined,
        isDisabled: isDisabled !== undefined ? !!isDisabled : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : null 
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.COURSE_UPDATED,
      actionDescription: `${session.name} updated course "${updatedCourse.name}"`,
      moduleName: MODULE.COURSES,
      targetId: id,
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error('Error updating course:', error)
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

    if (!isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const courseToDelete = await prisma.course.findUnique({
      where: { id },
      select: { name: true, isDemo: true },
    })

    if (!courseToDelete) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (courseToDelete.isDemo) {
      return NextResponse.json({ 
        error: 'Cannot delete the Demo Course. It is required for new student enrollment.' 
      }, { status: 400 })
    }

    await prisma.course.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.COURSE_DELETED,
      actionDescription: `${session.name} deleted course "${courseToDelete?.name ?? id}"`,
      moduleName: MODULE.COURSES,
      targetId: id,
    })

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

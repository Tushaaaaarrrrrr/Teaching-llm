import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = await request.json()
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    const course = await (prisma.course.findUnique as any)({
      where: { id: courseId },
    })

    if (!course || !course.isFree) {
      return NextResponse.json({ error: 'Free course not found' }, { status: 404 })
    }

    if (course.isDisabled) {
      return NextResponse.json({ error: 'This course is currently disabled' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json({ message: 'Already enrolled' })
    }

    await prisma.$transaction(async (tx) => {
      await (tx.enrollment.create as any)({
        data: {
          userId: session.userId,
          courseId,
          isFreeEnrollment: true,
        },
      })
      await queueGoogleGroupSyncJobs(tx, {
        userEmail: session.email,
        courseIds: [courseId],
        action: 'ADD',
      })
    })

    // Log the free course enrollment activity
    logActivity({
      userId: user.id,
      userName: user.name || 'Unknown',
      userRole: user.role || 'STUDENT',
      actionType: ACTION.FREE_ENROLLMENT,
      actionDescription: `Enrolled in free course "${course.name}"`,
      moduleName: MODULE.ENROLLMENT,
      targetId: courseId,
    })

    return NextResponse.json({ message: 'Successfully enrolled' }, { status: 201 })
  } catch (error) {
    console.error('Error in free course enrollment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    const enrollment = await (prisma.enrollment.findUnique as any)({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
      include: {
        course: true,
      },
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only allow unenrollment if it's a free enrollment OR the course is currently free
    if (!enrollment.isFreeEnrollment && !enrollment.course.isFree) {
       return NextResponse.json({ error: 'Cannot self-unenroll from paid courses' }, { status: 403 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.enrollment.delete({
        where: {
          id: enrollment.id,
        },
      })
      await queueGoogleGroupSyncJobs(tx, {
        userEmail: session.email,
        courseIds: [courseId],
        action: 'REMOVE',
      })
    })

    // Log the unenrollment activity
    logActivity({
      userId: user.id,
      userName: user.name || 'Unknown',
      userRole: user.role || 'STUDENT',
      actionType: ACTION.FREE_UNENROLLMENT,
      actionDescription: `Unenrolled from free course "${enrollment.course.name}"`,
      moduleName: MODULE.ENROLLMENT,
      targetId: courseId,
    })

    return NextResponse.json({ message: 'Successfully unenrolled' })
  } catch (error) {
    console.error('Error in free course unenrollment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

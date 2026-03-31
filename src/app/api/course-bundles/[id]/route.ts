import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { isCourseExpired } from '@/lib/course-state'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { name, description, courseIds = [] } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Bundle name is required' }, { status: 400 })
    }

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one course' }, { status: 400 })
    }

    const bundle = await prisma.courseBundle.findFirst({
      where: { id },
      select: { id: true },
    })

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)))
    const disabledCourses = await (prisma.course.findMany as any)({
      where: { id: { in: uniqueCourseIds } },
      select: { name: true, isDisabled: true, expiresAt: true },
    })
    const unavailableCourses = disabledCourses.filter((course: any) => course.isDisabled || isCourseExpired(course))
    if (unavailableCourses.length > 0) {
      return NextResponse.json({ error: `Disabled or expired courses cannot be added to bundles: ${unavailableCourses.map(course => course.name).join(', ')}` }, { status: 400 })
    }

    const updated = await prisma.$transaction(async tx => {
      await tx.courseBundle.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
        },
      })

      await tx.courseBundleCourse.deleteMany({ where: { bundleId: id } })
      await tx.courseBundleCourse.createMany({
        data: uniqueCourseIds.map((courseId: string) => ({
          bundleId: id,
          courseId,
        })),
      })

      return tx.courseBundle.findUnique({
        where: { id },
        include: {
          courses: {
            include: {
              course: {
                select: { id: true, name: true, color: true, subject: true },
              },
            },
          },
          _count: {
            select: {
              courses: true,
              userAssignments: true,
            },
          },
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating course bundle:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A bundle with this name already exists' }, { status: 400 })
    }
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

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const bundle = await prisma.courseBundle.findFirst({
      where: { id },
      select: { id: true },
    })

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    await prisma.courseBundle.delete({ where: { id } })
    return NextResponse.json({ message: 'Bundle deleted successfully' })
  } catch (error) {
    console.error('Error deleting course bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

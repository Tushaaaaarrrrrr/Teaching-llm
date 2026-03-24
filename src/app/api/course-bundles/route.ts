import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bundles = await prisma.courseBundle.findMany({
      where: { createdById: session.userId },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, name: true, color: true, subject: true },
            },
          },
          orderBy: { course: { name: 'asc' } },
        },
        _count: {
          select: {
            courses: true,
            userAssignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bundles)
  } catch (error) {
    console.error('Error fetching course bundles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, courseIds = [] } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Bundle name is required' }, { status: 400 })
    }

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one course' }, { status: 400 })
    }

    const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)))
    const disabledCourses = await (prisma.course.findMany as any)({
      where: { id: { in: uniqueCourseIds }, isDisabled: true },
      select: { name: true },
    })
    if (disabledCourses.length > 0) {
      return NextResponse.json({ error: `Disabled courses cannot be added to bundles: ${disabledCourses.map(course => course.name).join(', ')}` }, { status: 400 })
    }

    const bundle = await prisma.$transaction(async tx => {
      const created = await tx.courseBundle.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          createdById: session.userId,
        },
      })

      await tx.courseBundleCourse.createMany({
        data: uniqueCourseIds.map((courseId: string) => ({
          bundleId: created.id,
          courseId,
        })),
      })

      return tx.courseBundle.findUnique({
        where: { id: created.id },
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

    return NextResponse.json(bundle, { status: 201 })
  } catch (error: any) {
    console.error('Error creating course bundle:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A bundle with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

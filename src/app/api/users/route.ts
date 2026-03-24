import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        email: true,
        role: true,
        isTerminated: true,
        createdAt: true,
        enrollments: {
          select: {
            courseId: true,
            course: { select: { id: true, name: true, color: true, subject: true } },
          },
        },
        instructorAssignments: {
          select: {
            courseId: true,
            course: { select: { id: true, name: true, color: true, subject: true } },
          },
        },
        courseBundleAssignments: {
          select: {
            bundleId: true,
            bundle: {
              select: {
                id: true,
                name: true,
                courses: {
                  select: {
                    course: { select: { id: true, name: true, color: true, subject: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
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

    const {
      name,
      firstName,
      lastName,
      mobileNumber,
      email,
      password,
      role,
      gender = 'MALE',
      classIds = [],
      courseIds = [],
      assignedClassIds = [],
      bundleIds = [],
    } = await request.json()
    const finalClassIds = classIds.length > 0 ? classIds : courseIds

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    // Handle auto-password generation if missing
    let tempPassword = ''
    let actualPassword = password
    if (!password || password.trim() === '') {
      tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase()
      actualPassword = tempPassword
    }

    const passwordHash = await hashPassword(actualPassword)
    const securityNumber = 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase()
    const uniqueBundleIds = Array.from(new Set((bundleIds || []).filter(Boolean))) as string[]

    const user = await prisma.$transaction(async (tx) => {
      const bundleCourseRows = uniqueBundleIds.length > 0
        ? await tx.courseBundleCourse.findMany({
            where: { bundleId: { in: uniqueBundleIds } },
            select: { courseId: true },
          })
        : []
      const effectiveCourseIds = Array.from(new Set([
        ...finalClassIds,
        ...bundleCourseRows.map(row => row.courseId),
      ]))

      const blockedCourses = effectiveCourseIds.length > 0
        ? await (tx.course.findMany as any)({
            where: { id: { in: effectiveCourseIds }, isDisabled: true },
            select: { name: true },
          })
        : []
      if (blockedCourses.length > 0) {
        throw new Error(`Disabled courses cannot be assigned: ${blockedCourses.map(course => course.name).join(', ')}`)
      }

      if (role === 'INSTRUCTOR' && assignedClassIds.length > 0) {
        const blockedInstructorCourses = await (tx.course.findMany as any)({
          where: { id: { in: assignedClassIds }, isDisabled: true },
          select: { name: true },
        })
        if (blockedInstructorCourses.length > 0) {
          throw new Error(`Disabled courses cannot be assigned: ${blockedInstructorCourses.map(course => course.name).join(', ')}`)
        }
      }

      const newUser = await tx.user.create({
        data: {
          name: name || `${firstName} ${lastName || ''}`.trim(),
          firstName: firstName || name?.split(' ')[0] || '',
          lastName: lastName || name?.split(' ').slice(1).join(' ') || '',
          mobileNumber,
          email: email.toLowerCase(),
          passwordHash,
          role,
          securityNumber,
          gender,
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      if (effectiveCourseIds.length > 0) {
        await tx.enrollment.createMany({
          data: effectiveCourseIds.map((courseId: string) => ({
            userId: newUser.id,
            courseId,
          })),
        })
      }

      if (uniqueBundleIds.length > 0) {
        await tx.userCourseBundleAssignment.createMany({
          data: uniqueBundleIds.map((bundleId: string) => ({
            userId: newUser.id,
            bundleId,
            assignedById: session.userId,
          })),
        })
      }

      // Create instructor assignments if role is INSTRUCTOR
      if (role === 'INSTRUCTOR' && assignedClassIds.length > 0) {
        await tx.instructorAssignment.createMany({
          data: assignedClassIds.map((courseId: string) => ({
            instructorId: newUser.id,
            courseId,
          })),
        })
      }

      return newUser
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.USER_CREATED,
      actionDescription: `${session.name} created ${role} account for ${name} (${email})`,
      moduleName: MODULE.USER_MGMT,
      targetId: user.id,
    })

    return NextResponse.json({
      ...user,
      tempPassword: tempPassword || undefined
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: error instanceof Error ? 400 : 500 })
  }
}

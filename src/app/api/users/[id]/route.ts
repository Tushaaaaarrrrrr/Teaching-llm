import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { isCourseExpired } from '@/lib/course-state'

export async function GET(
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        email: true,
        role: true,
        securityNumber: true,
        createdAt: true,
        gender: true,
        avatar: true,
        isGoogleUser: true,
        isTerminated: true,
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
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
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

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { name, firstName, lastName, mobileNumber, email, role, password, isTerminated, classIds, courseIds, assignedClassIds, assignedCourseIds, bundleIds } = await request.json()
    const nextCourseIds = classIds !== undefined ? classIds : courseIds
    const nextAssignedCourseIds = assignedClassIds !== undefined ? assignedClassIds : assignedCourseIds
    const nextBundleIds = Array.isArray(bundleIds) ? Array.from(new Set(bundleIds.filter(Boolean))) : undefined

    const data: Record<string, any> = {}
    if (firstName !== undefined) data.firstName = firstName
    if (lastName !== undefined) data.lastName = lastName
    
    // Derived name update or explicit name update
    if (name !== undefined) {
      data.name = name
    } else if (firstName !== undefined || lastName !== undefined) {
      // Reconstruct name for legacy support
      const current = await prisma.user.findUnique({ where: { id }, select: { firstName: true, lastName: true, name: true } })
      const fn = firstName !== undefined ? firstName : (current?.firstName || '')
      const ln = lastName !== undefined ? lastName : (current?.lastName || '')
      data.name = `${fn} ${ln}`.trim()
    }

    if (mobileNumber !== undefined) {
      data.mobileNumber = mobileNumber
    }

    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = role
    if (typeof isTerminated === 'boolean') data.isTerminated = isTerminated

    if (password) {
      data.passwordHash = await hashPassword(password)
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
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
        },
      })

      if (nextCourseIds !== undefined || nextBundleIds !== undefined) {
        const directCourseIds = Array.isArray(nextCourseIds) ? nextCourseIds : []
        const bundleCourseRows = nextBundleIds && nextBundleIds.length > 0
          ? await tx.courseBundleCourse.findMany({
              where: { bundleId: { in: nextBundleIds } },
              select: { courseId: true },
            })
          : []
        const effectiveCourseIds = Array.from(new Set([
          ...directCourseIds,
          ...bundleCourseRows.map(row => row.courseId),
        ]))

        const blockedCourses = effectiveCourseIds.length > 0
          ? await (tx.course.findMany as any)({
              where: { id: { in: effectiveCourseIds } },
              select: { name: true, isDisabled: true, expiresAt: true },
            })
          : []
        const unavailableCourses = blockedCourses.filter((course: any) => course.isDisabled || isCourseExpired(course))
        if (unavailableCourses.length > 0) {
          throw new Error(`Disabled or expired courses cannot be assigned: ${unavailableCourses.map(course => course.name).join(', ')}`)
        }

        await tx.enrollment.deleteMany({ where: { userId: id } })
        if (effectiveCourseIds.length > 0) {
          await tx.enrollment.createMany({
            data: effectiveCourseIds.map((courseId: string) => ({
              userId: id,
              courseId,
            })),
          })
        }
      }

      // Handle instructor subject assignments (MANAGER only)
      if (nextAssignedCourseIds !== undefined) {
        const blockedInstructorCourses = nextAssignedCourseIds.length > 0
          ? await (tx.course.findMany as any)({
              where: { id: { in: nextAssignedCourseIds } },
              select: { name: true, isDisabled: true, expiresAt: true },
            })
          : []
        const unavailableInstructorCourses = blockedInstructorCourses.filter((course: any) => course.isDisabled || isCourseExpired(course))
        if (unavailableInstructorCourses.length > 0) {
          throw new Error(`Disabled or expired courses cannot be assigned: ${unavailableInstructorCourses.map(course => course.name).join(', ')}`)
        }
        await tx.instructorAssignment.deleteMany({ where: { instructorId: id } })
        if (nextAssignedCourseIds.length > 0) {
          await tx.instructorAssignment.createMany({
            data: nextAssignedCourseIds.map((courseId: string) => ({
              instructorId: id,
              courseId,
            })),
          })
        }
      }

      if (nextBundleIds !== undefined) {
        await tx.userCourseBundleAssignment.deleteMany({ where: { userId: id } })
        if (nextBundleIds.length > 0) {
          await tx.userCourseBundleAssignment.createMany({
            data: nextBundleIds.map((bundleId: string) => ({
              userId: id,
              bundleId,
              assignedById: session.userId,
            })),
          })
        }
      }

      // Re-fetch with enrollments and instructor assignments
      return tx.user.findUnique({
        where: { id },
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
      })
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.USER_UPDATED,
      actionDescription: `${session.name} updated user ${updatedUser?.name || id}`,
      moduleName: MODULE.USER_MGMT,
      targetId: id,
      metadata: { changedFields: Object.keys(data) },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: error instanceof Error ? 400 : 500 })
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

    if (id === session.userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true, role: true } })
    await prisma.user.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.USER_DELETED,
      actionDescription: `${session.name} deleted user ${targetUser?.name || id} (${targetUser?.email || 'unknown'})`,
      moduleName: MODULE.USER_MGMT,
      targetId: id,
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

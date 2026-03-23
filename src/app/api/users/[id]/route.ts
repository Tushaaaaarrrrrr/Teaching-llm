import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTerminated: true,
        isGoogleUser: true,
        createdAt: true,
        gender: true,
        avatar: true,
        securityNumber: true,
        isSuperManager: true,
        canTerminate: true,
        canCreateStudents: true,
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

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { name, email, role, password, isTerminated, classIds, assignedClassIds } = await request.json()

    // ADMIN restrictions
    if (session.role === 'ADMIN') {
      const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } })
      if (!targetUser || targetUser.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Admins can only edit student accounts' }, { status: 403 })
      }
      if (role !== undefined || isTerminated !== undefined) {
        return NextResponse.json({ error: 'Admins cannot change role or termination status' }, { status: 403 })
      }
    }

    // Validate classIds for ADMINs
    if (session.role === 'ADMIN' && classIds !== undefined && classIds.length > 0) {
      const adminCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      const unauthorized = classIds.filter((cid: string) => !adminCourseIds?.includes(cid))
      if (unauthorized.length > 0) {
        return NextResponse.json({ error: 'Cannot assign classes you don\'t have access to' }, { status: 403 })
      }
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
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
          email: true,
          role: true,
          isTerminated: true,
          createdAt: true,
        },
      })

      if (classIds !== undefined) {
        await tx.enrollment.deleteMany({ where: { userId: id } })
        if (classIds.length > 0) {
          await tx.enrollment.createMany({
            data: classIds.map((courseId: string) => ({
              userId: id,
              courseId,
            })),
          })
        }
      }

      // Handle instructor subject assignments (MANAGER only)
      if (assignedClassIds !== undefined) {
        await tx.instructorAssignment.deleteMany({ where: { instructorId: id } })
        if (assignedClassIds.length > 0) {
          await tx.instructorAssignment.createMany({
            data: assignedClassIds.map((courseId: string) => ({
              instructorId: id,
              courseId,
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

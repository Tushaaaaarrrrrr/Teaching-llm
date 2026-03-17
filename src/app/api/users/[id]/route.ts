import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleClassIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

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
    const { name, email, role, password, isTerminated, canTerminate, canCreateStudents, classIds, assignedClassIds } = await request.json()

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
      const adminClassIds = await getAccessibleClassIds(session.userId, session.role)
      const unauthorized = classIds.filter((cid: string) => !adminClassIds?.includes(cid))
      if (unauthorized.length > 0) {
        return NextResponse.json({ error: 'Cannot assign classes you don\'t have access to' }, { status: 403 })
      }
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = role
    if (typeof isTerminated === 'boolean') data.isTerminated = isTerminated
    if (session.role === 'MANAGER') {
      if (typeof canTerminate === 'boolean') data.canTerminate = canTerminate
      if (typeof canCreateStudents === 'boolean') data.canCreateStudents = canCreateStudents
    }

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
            data: classIds.map((classId: string) => ({
              userId: id,
              classId,
            })),
          })
        }
      }

      // Handle instructor subject assignments (MANAGER only)
      if (assignedClassIds !== undefined) {
        await tx.instructorAssignment.deleteMany({ where: { instructorId: id } })
        if (assignedClassIds.length > 0) {
          await tx.instructorAssignment.createMany({
            data: assignedClassIds.map((classId: string) => ({
              instructorId: id,
              classId,
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
              classId: true,
              class: { select: { id: true, name: true, color: true, subject: true } },
            },
          },
          instructorAssignments: {
            select: {
              classId: true,
              class: { select: { id: true, name: true, color: true, subject: true } },
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

    if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    if (id === session.userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    // Role-based deletion logic
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true, role: true } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (session.role === 'ADMIN') {
      if (!session.canTerminate) {
        return NextResponse.json({ error: 'You do not have permission to terminate users' }, { status: 403 })
      }
      if (targetUser.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Admins can only delete student accounts' }, { status: 403 })
      }
    }
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

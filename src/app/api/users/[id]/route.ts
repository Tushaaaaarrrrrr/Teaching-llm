import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import crypto from 'crypto'
import { encryptPassword } from '@/lib/encryption'

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

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true, isSuperManager: true, email: true } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const sessionUser = await prisma.user.findUnique({ where: { id: session.userId } })

    // ADMIN restrictions
    if (session.role === 'ADMIN') {
      if (targetUser.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Admins can only edit student accounts' }, { status: 403 })
      }
      if (role !== undefined || isTerminated !== undefined) {
        return NextResponse.json({ error: 'Admins cannot change role or termination status' }, { status: 403 })
      }
    }

    // MANAGER restrictions
    if (session.role === 'MANAGER' && !sessionUser?.isSuperManager) {
      if (targetUser.isSuperManager) {
         return NextResponse.json({ error: 'Cannot modify Super Manager' }, { status: 403 })
      }
    }

    if (targetUser.isSuperManager && email !== undefined && email !== targetUser.email) {
      return NextResponse.json({ error: 'Cannot change Super Manager email' }, { status: 403 })
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
    if (email !== undefined && email !== targetUser.email) data.email = email
    if (role !== undefined && !targetUser.isSuperManager) data.role = role
    if (typeof isTerminated === 'boolean' && !targetUser.isSuperManager) data.isTerminated = isTerminated

    let tempPassword = undefined
    if (password) {
      tempPassword = crypto.randomBytes(12).toString('hex')
      data.passwordHash = await hashPassword(tempPassword)
      data.encryptedTempPassword = encryptPassword(tempPassword)
      data.passwordRevealCount = 0
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

      // Add private notification for credential changes
      if (data.email || data.passwordHash) {
        await tx.notification.create({
          data: {
            userId: id,
            title: 'Security Alert: Credential Update',
            content: 'Your account credentials were updated. If this wasn\'t you, contact support immediately.',
            type: 'WARNING',
          }
        })
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

    if (tempPassword) {
      return NextResponse.json({ ...updatedUser, tempPassword })
    }
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

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true, role: true, isSuperManager: true } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const sessionUser = await prisma.user.findUnique({ where: { id: session.userId } })

    if (targetUser.isSuperManager) {
      return NextResponse.json({ error: 'Super Manager cannot be deleted' }, { status: 403 })
    }

    if (targetUser.role === 'MANAGER' && !sessionUser?.isSuperManager) {
      return NextResponse.json({ error: 'Only Super Manager can delete another manager' }, { status: 403 })
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

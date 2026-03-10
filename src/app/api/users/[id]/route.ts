import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleClassIds } from '@/lib/auth'

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
    const { name, email, role, password, isTerminated, classIds } = await request.json()

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

      // Re-fetch with enrollments
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
        },
      })
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

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

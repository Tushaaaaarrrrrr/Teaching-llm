import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import crypto from 'crypto'
import { encryptPassword } from '@/lib/encryption'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: Record<string, any> = {}

    if (session.role === 'ADMIN') {
      const adminCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      where = {
        role: 'STUDENT',
        enrollments: {
          some: { courseId: { in: adminCourseIds || [] } },
        },
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTerminated: true,
        isSuperManager: true,
        passwordRevealCount: true,
        createdAt: true,
        passwordHash: true,
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
      orderBy: { createdAt: 'desc' },
    })

    // Strip passwordHash, add isGoogleAuth flag
    const safeUsers = users.map(({ passwordHash, ...rest }) => ({
      ...rest,
      isGoogleAuth: passwordHash === '',
    }))

    return NextResponse.json(safeUsers)
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

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, email, password, role, classIds = [], assignedClassIds = [] } = await request.json()

    // ADMINs can only create STUDENT accounts
    if (session.role === 'ADMIN' && role !== 'STUDENT') {
      return NextResponse.json({ error: 'Admins can only create student accounts' }, { status: 403 })
    }

    // ADMINs can only assign classes they have access to
    if (session.role === 'ADMIN' && classIds.length > 0) {
      const adminCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      const unauthorized = classIds.filter((id: string) => !adminCourseIds?.includes(id))
      if (unauthorized.length > 0) {
        return NextResponse.json({ error: 'Cannot assign classes you don\'t have access to' }, { status: 403 })
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    if (role === 'MANAGER') {
      const managerCount = await prisma.user.count({ where: { role: 'MANAGER' } })
      if (managerCount >= 2) {
        return NextResponse.json({ error: 'Maximum 2 managers allowed' }, { status: 403 })
      }
    }

    const tempPassword = crypto.randomBytes(12).toString('hex')
    const passwordHash = await hashPassword(tempPassword)
    const encryptedTempPassword = encryptPassword(tempPassword)
    const securityNumber = 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase()

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          encryptedTempPassword,
          passwordRevealCount: 0,
          role,
          securityNumber,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      if (classIds.length > 0) {
        await tx.enrollment.createMany({
          data: classIds.map((courseId: string) => ({
            userId: newUser.id,
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

    return NextResponse.json({ ...user, tempPassword }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

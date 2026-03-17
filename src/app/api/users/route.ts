import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleClassIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

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
      const adminClassIds = await getAccessibleClassIds(session.userId, session.role)
      where = {
        role: 'STUDENT',
        enrollments: {
          some: { classId: { in: adminClassIds || [] } },
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
        createdAt: true,
        ...(session.role === 'MANAGER' ? { gender: true } : {}),
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

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { 
      name, email, password, role, gender,
      classIds = [], assignedClassIds = [], 
      canTerminate = false, canCreateStudents = false 
    } = await request.json()

    if (!gender) {
      return NextResponse.json({ error: 'Gender is required' }, { status: 400 })
    }

    // ADMINs can only create STUDENT accounts and must have permission
    if (session.role === 'ADMIN') {
      if (role !== 'STUDENT') {
        return NextResponse.json({ error: 'Admins can only create student accounts' }, { status: 403 })
      }
      if (!session.canCreateStudents) {
        return NextResponse.json({ error: 'You do not have permission to create students' }, { status: 403 })
      }
    }

    // ADMINs can only assign classes they have access to
    if (session.role === 'ADMIN' && classIds.length > 0) {
      const adminClassIds = await getAccessibleClassIds(session.userId, session.role)
      const unauthorized = classIds.filter((id: string) => !adminClassIds?.includes(id))
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

    const passwordHash = await hashPassword(password)
    const securityNumber = 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase()

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role,
          gender: gender.toUpperCase(),
          avatar: gender.toUpperCase() === 'FEMALE' ? '/images/default-female.png' : '/images/default-male.png',
          securityNumber,
          canTerminate: session.role === 'MANAGER' ? canTerminate : false,
          canCreateStudents: session.role === 'MANAGER' ? canCreateStudents : false,
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
          data: classIds.map((classId: string) => ({
            userId: newUser.id,
            classId,
          })),
        })
      }

      // Create instructor assignments if role is INSTRUCTOR
      if (role === 'INSTRUCTOR' && assignedClassIds.length > 0) {
        await tx.instructorAssignment.createMany({
          data: assignedClassIds.map((classId: string) => ({
            instructorId: newUser.id,
            classId,
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

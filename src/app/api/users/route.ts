import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleCourseIds } from '@/lib/auth'
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
        createdAt: true,
        ...(session.role === 'MANAGER' ? { gender: true } : {}),
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
      courseIds = [], assignedCourseIds = [], 
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

    // ADMINs can only assign courses they have access to
    if (session.role === 'ADMIN' && courseIds.length > 0) {
      const adminCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      const unauthorized = courseIds.filter((id: string) => !adminCourseIds?.includes(id))
      if (unauthorized.length > 0) {
        return NextResponse.json({ error: 'Cannot assign courses you don\'t have access to' }, { status: 403 })
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

      if (courseIds.length > 0) {
        await tx.enrollment.createMany({
          data: courseIds.map((courseId: string) => ({
            userId: newUser.id,
            courseId,
          })),
        })
      }

      // Create instructor assignments if role is INSTRUCTOR
      if (role === 'INSTRUCTOR' && assignedCourseIds.length > 0) {
        await tx.instructorAssignment.createMany({
          data: assignedCourseIds.map((courseId: string) => ({
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

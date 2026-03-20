import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, hashPassword, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(_request ? _request.url : '')
    const search = searchParams.get('search')
    const securityNumber = searchParams.get('securityNumber')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: Record<string, any> = {}

    if (session.role === 'ADMIN') {
      const adminCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      where.role = 'STUDENT'
      where.enrollments = {
        some: { courseId: { in: adminCourseIds || [] } },
      }
    }

    if (securityNumber) {
      where.securityNumber = securityNumber.trim().toUpperCase()
    } else if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { securityNumber: { contains: search } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        securityNumber: true,
        isTerminated: true,
        isSuperManager: true,
        createdAt: true,
        googleCredential: { select: { id: true } },
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

    const superAdminEmail = 'lkiitmng2428@gmail.com'

    // If ADMIN, they can only see STUDENTS + the super admin (LMS Policy)
    if (session.role === 'ADMIN') {
      const superAdmin = await prisma.user.findUnique({
        where: { email: superAdminEmail },
        select: {
          id: true, name: true, email: true, role: true, securityNumber: true, isTerminated: true, isSuperManager: true, createdAt: true,
          googleCredential: { select: { id: true } },
          enrollments: { select: { courseId: true, course: { select: { id: true, name: true, color: true, subject: true } } } },
          instructorAssignments: { select: { courseId: true, course: { select: { id: true, name: true, color: true, subject: true } } } },
        }
      })
      
      if (superAdmin && !users.find(u => u.id === superAdmin.id)) {
        users.push(superAdmin as any)
      }
    }

    const transformedUsers = users.map((u: any) => ({
      ...u,
      isGoogleAuth: !!u.googleCredential,
      isSuperManager: u.isSuperManager || u.email === superAdminEmail,
      googleCredential: undefined
    }))

    if (securityNumber && transformedUsers.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(transformedUsers)
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

    const passwordHash = await hashPassword(password)
    const securityNumber = 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase()

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

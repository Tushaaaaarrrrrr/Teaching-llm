import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    const where: any = {
      isGlobal: false,
    }

    if (session.role !== 'MANAGER') {
      where.isDisabled = false
    }

    if (accessibleCourseIds !== null) {
      where.id = { in: accessibleCourseIds }
    }

    // Fetch courses but return them as "classes" for frontend compatibility
    const courses = await (prisma.course.findMany as any)({
      where,
      select: {
        id: true,
        name: true,
        subject: true,
        color: true,
        icon: true,
        isDisabled: true,
        isCommunityActive: true,
        _count: {
          select: {
            lectures: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

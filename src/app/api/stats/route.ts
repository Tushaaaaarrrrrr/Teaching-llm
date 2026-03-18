import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    const courseFilter = accessibleCourseIds !== null
      ? { courseId: { in: accessibleCourseIds } }
      : {}

    const courseCountFilter = accessibleCourseIds !== null
      ? { id: { in: accessibleCourseIds } }
      : {}

    const [totalCourses, totalLectures, totalStudents, upcomingSessions, totalMaterials] =
      await Promise.all([
        (prisma.course as any).count({ where: courseCountFilter }),
        (prisma.lecture as any).count({ where: courseFilter as any }),
        (prisma.user as any).count({ where: { role: 'STUDENT' } }),
        (prisma.calendarEvent as any).count({
          where: {
            type: 'live',
            status: { in: ['scheduled', 'live'] },
            ...courseFilter,
          } as any,
        }),
        (prisma.material as any).count({ where: courseFilter as any }),
      ])

    return NextResponse.json({
      totalCourses,
      totalLectures,
      totalStudents,
      upcomingSessions,
      totalMaterials,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

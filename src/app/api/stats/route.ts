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

    const classFilter = accessibleCourseIds !== null
      ? { courseId: { in: accessibleCourseIds } }
      : {}

    const classCountFilter = accessibleCourseIds !== null
      ? { id: { in: accessibleCourseIds } }
      : {}

    const [totalClasses, totalLectures, totalStudents, upcomingSessions, totalMaterials] =
      await Promise.all([
        prisma.course.count({ where: classCountFilter }),
        prisma.lecture.count({ where: classFilter }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.courseEvent.count({
          where: {
            startTime: { gte: new Date() },
            ...classFilter,
          },
        }),
        prisma.material.count({ where: classFilter }),
      ])

    return NextResponse.json({
      totalClasses,
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

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleClassIds } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)

    const classFilter = accessibleClassIds !== null
      ? { classId: { in: accessibleClassIds } }
      : {}

    const classCountFilter = accessibleClassIds !== null
      ? { id: { in: accessibleClassIds } }
      : {}

    const [totalClasses, totalLectures, totalStudents, upcomingSessions, totalMaterials] =
      await Promise.all([
        prisma.class.count({ where: classCountFilter }),
        prisma.lecture.count({ where: classFilter }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.liveSession.count({
          where: {
            status: { in: ['scheduled', 'live'] },
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

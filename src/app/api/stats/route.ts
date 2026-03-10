import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalClasses, totalLectures, totalStudents, upcomingSessions, totalMaterials] =
      await Promise.all([
        prisma.class.count(),
        prisma.lecture.count(),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.liveSession.count({
          where: {
            status: { in: ['scheduled', 'live'] },
          },
        }),
        prisma.material.count(),
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

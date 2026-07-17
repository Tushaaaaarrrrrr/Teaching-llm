import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManagerOrSuperAdmin } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session || !isManagerOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category') || undefined
    const courseId = searchParams.get('courseId') || undefined

    const where: Record<string, any> = {}
    if (category) where.category = category
    if (courseId) where.courseId = courseId

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[notification-logs] Error fetching logs:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

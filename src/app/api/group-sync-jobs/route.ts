import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const jobs = await (prisma as any).groupSyncJob.findMany({
      include: {
        course: {
          select: {
            id: true,
            name: true,
            googleGroupEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching Google sync jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

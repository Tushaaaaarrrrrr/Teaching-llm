import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleClassIds } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}
    if (status) where.status = status

    const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)
    if (accessibleClassIds !== null) {
      where.classId = { in: accessibleClassIds }
    }

    const liveSessions = await prisma.liveSession.findMany({
      where,
      include: {
        class: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(liveSessions)
  } catch (error) {
    console.error('Error fetching live sessions:', error)
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

    const { classId, title, description, meetingLink, instructor, date, time, status } =
      await request.json()

    // Verify ADMIN has access to the target class
    if (session.role === 'ADMIN') {
      const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)
      if (accessibleClassIds !== null && !accessibleClassIds.includes(classId)) {
        return NextResponse.json({ error: 'No access to this class' }, { status: 403 })
      }
    }

    const liveSession = await prisma.liveSession.create({
      data: {
        classId,
        title,
        description,
        meetingLink,
        instructor,
        date,
        time,
        status,
        createdById: session.userId,
      },
    })

    return NextResponse.json(liveSession, { status: 201 })
  } catch (error) {
    console.error('Error creating live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

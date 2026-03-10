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
    const month = searchParams.get('month')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}
    if (month) where.date = { startsWith: month }

    const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)
    if (accessibleClassIds !== null) {
      where.OR = [
        { classId: null },
        { classId: { in: accessibleClassIds } },
      ]
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        class: true,
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
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

    const { title, description, date, time, type, relatedClass, classId } =
      await request.json()

    // Verify ADMIN has access to the target class
    if (session.role === 'ADMIN' && classId) {
      const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)
      if (accessibleClassIds !== null && !accessibleClassIds.includes(classId)) {
        return NextResponse.json({ error: 'No access to this class' }, { status: 403 })
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        date,
        time,
        type,
        relatedClass,
        classId,
        createdById: session.userId,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleClassIds } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleClassIds = await getAccessibleClassIds(session.userId, session.role)

    const where = accessibleClassIds !== null
      ? { id: { in: accessibleClassIds } }
      : {}

    const classes = await prisma.class.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        _count: {
          select: {
            lectures: true,
            materials: true,
            liveSessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(classes)
  } catch (error) {
    console.error('Error fetching classes:', error)
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

    const { name, description, subject, color, icon } = await request.json()

    const newClass = await prisma.$transaction(async (tx) => {
      const cls = await tx.class.create({
        data: {
          name,
          description,
          subject,
          color,
          icon,
          createdById: session.userId,
        },
      })

      // Auto-enroll the creating ADMIN so they have immediate access
      if (session.role === 'ADMIN') {
        await tx.enrollment.create({
          data: { userId: session.userId, classId: cls.id },
        })
      }

      return cls
    })

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    console.error('Error creating class:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

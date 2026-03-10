import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'

// GET: Return transcript data for a community (classId query param)
// Manager-only — includes ALL messages, including deleted ones with original content
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Manager access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    // If no classId, return list of all classes with message counts
    if (!classId) {
      const classes = await prisma.class.findMany({
        include: {
          _count: { select: { communityMessages: true } },
        },
        orderBy: { name: 'asc' },
      })

      const classesWithStats = await Promise.all(
        classes.map(async (cls) => {
          const deletedCount = await prisma.communityMessage.count({
            where: { classId: cls.id, isDeleted: true },
          })
          return {
            id: cls.id,
            name: cls.name,
            subject: cls.subject,
            color: cls.color,
            totalMessages: cls._count.communityMessages,
            deletedMessages: deletedCount,
          }
        })
      )

      return NextResponse.json({ classes: classesWithStats })
    }

    // Fetch all messages for this class, including deleted ones with full content
    const messages = await prisma.communityMessage.findMany({
      where: { classId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            securityNumber: true,
          },
        },
        class: {
          select: {
            name: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

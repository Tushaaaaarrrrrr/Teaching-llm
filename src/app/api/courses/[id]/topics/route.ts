import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const topics = await prisma.topic.findMany({
      where: { courseId: id },
      orderBy: { order: 'asc' },
      include: {
        content: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(topics)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const { title } = await request.json()

    const count = await prisma.topic.count({ where: { courseId: id } })
    const topic = await prisma.topic.create({
      data: { courseId: id, title, order: count },
      include: { content: true },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TOPIC_CREATED,
      actionDescription: `${session.name} created topic "${title}"`,
      moduleName: MODULE.TOPICS,
      targetId: topic.id,
    })

    return NextResponse.json(topic)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

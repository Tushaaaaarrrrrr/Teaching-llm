import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: topicId } = await params
    const { contentId } = await request.json()

    if (!contentId) {
      return NextResponse.json({ error: 'Lecture is required' }, { status: 400 })
    }

    const [topic, content] = await Promise.all([
      prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } }),
      prisma.content.findUnique({ where: { id: contentId }, select: { id: true, topicId: true } }),
    ])

    if (!topic || !content) {
      return NextResponse.json({ error: 'Topic or lecture not found' }, { status: 404 })
    }

    if (content.topicId === topicId) {
      return NextResponse.json({ error: 'Lecture already belongs to this topic' }, { status: 400 })
    }

    const shared = await prisma.topicSharedContent.create({
      data: { topicId, contentId },
    })

    return NextResponse.json(shared, { status: 201 })
  } catch (error: any) {
    console.error('Error importing shared lecture:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Lecture already imported into this topic' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

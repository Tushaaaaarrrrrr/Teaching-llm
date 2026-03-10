import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const classId  = searchParams.get('classId')
    const topicId  = searchParams.get('topicId')
    const hasVideo = searchParams.get('hasVideo')
    const hasPpt   = searchParams.get('hasPpt')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    if (topicId) {
      where.topicId = topicId
    } else if (classId) {
      where.topic = { classId }
    }

    if (hasVideo === 'true') {
      where.videoUrl = { not: null }
    }

    if (hasPpt === 'true') {
      where.pptUrl = { not: null }
    }

    const content = await prisma.content.findMany({
      where,
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            order: true,
            classId: true,
            class: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ content })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    let whereClause: any = { userId: session.userId }

    if (courseId) {
      whereClause.content = {
        topic: { courseId: courseId }
      }
    }

    const progress = await prisma.lectureProgress.findMany({
      where: whereClause,
      select: {
        contentId: true,
        status: true,
      }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Error fetching lecture progress:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, status } = body

    if (!contentId || !status) {
      return NextResponse.json({ error: 'Missing contentId or status' }, { status: 400 })
    }

    // Push to the queue instead of direct upsert
    const queueItem = await prisma.lectureProgressQueue.create({
      data: {
        userId: session.userId,
        contentId: contentId,
        status: status,
      }
    })

    return NextResponse.json({ success: true, queueId: queueItem.id })
  } catch (error) {
    console.error('Error updating lecture progress:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}

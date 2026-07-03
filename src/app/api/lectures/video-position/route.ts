import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * GET /api/lectures/video-position?contentId=xxx
 * Returns the saved playback position (in seconds) for the current user.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ position: 0 })
    }

    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    if (!contentId) {
      return NextResponse.json({ position: 0 })
    }

    const record = await prisma.lectureProgress.findUnique({
      where: { userId_contentId: { userId: session.userId, contentId } },
      select: { videoPosition: true },
    })

    return NextResponse.json({ position: record?.videoPosition ?? 0 })
  } catch (error) {
    console.error('Error fetching video position:', error)
    return NextResponse.json({ position: 0 })
  }
}

/**
 * POST /api/lectures/video-position
 * Body: { contentId: string, position: number }
 * Saves the playback position for resume-later.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, position } = body

    if (!contentId || typeof position !== 'number') {
      return NextResponse.json({ error: 'Missing contentId or position' }, { status: 400 })
    }

    const positionInt = Math.floor(Math.max(0, position))

    await prisma.lectureProgress.upsert({
      where: { userId_contentId: { userId: session.userId, contentId } },
      update: { videoPosition: positionInt },
      create: {
        userId: session.userId,
        contentId,
        status: 'IN_PROGRESS',
        videoPosition: positionInt,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving video position:', error)
    return NextResponse.json({ error: 'Failed to save position' }, { status: 500 })
  }
}

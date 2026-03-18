import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pollId = params.id
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { optionId } = await request.json()
    if (!optionId) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 })
    }

    // Check if poll exists and is not expired
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (new Date() > new Date(poll.expiresAt)) {
      return NextResponse.json({ error: 'Poll has expired' }, { status: 400 })
    }

    // Check if option belongs to poll
    if (!poll.options.some(opt => opt.id === optionId)) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
    }

    // Upsert response (allow changing vote if not expired, or strictly one-time as per requirement "Select one, and click submit")
    // Requirement says "Select one, and click submit", doesn't explicitly mention changing. 
    // Usually polls allow one vote.
    
    await prisma.pollResponse.upsert({
      where: {
        pollId_userId: { pollId, userId: session.userId }
      },
      update: { optionId },
      create: { pollId, userId: session.userId, optionId }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.POLL_VOTED,
      actionDescription: `${session.name} voted in poll "${poll.question}"`,
      moduleName: MODULE.ANNOUNCEMENTS,
      targetId: pollId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error voting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

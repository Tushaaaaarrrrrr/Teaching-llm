import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { validateLength, sanitizeInput } from '@/lib/validation'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const replies = await prisma.ticketReply.findMany({
      where: { ticketId: params.id },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(replies)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content } = await request.json()
 
    if (!content || !validateLength(content, 2000)) {
      return NextResponse.json({ error: 'Reply content must be between 1 and 2,000 characters' }, { status: 400 })
    }

    const sanitizedContent = sanitizeInput(content)

    const reply = await prisma.ticketReply.create({
      data: { ticketId: params.id, senderId: session.userId, content: sanitizedContent },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    // Auto-update ticket status to IN_PROGRESS when staff replies
    if (session.role !== 'STUDENT') {
      await prisma.supportTicket.update({
        where: { id: params.id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TICKET_REPLY_SENT,
      actionDescription: `${session.name} replied to support ticket`,
      moduleName: MODULE.SUPPORT,
      targetId: params.id,
    })

    return NextResponse.json(reply, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

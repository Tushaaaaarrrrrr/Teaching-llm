import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { sendSupportReplyNotification, sendTicketReplyNotificationToManagers } from '@/lib/system-notifications'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const replies = await prisma.ticketReply.findMany({
      where: { ticketId: params.id },
      include: { sender: { select: { id: true, name: true, role: true, avatar: true, gender: true } } },
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

    const { content, imageUrl } = await request.json()

    const reply = await prisma.ticketReply.create({
      data: { ticketId: params.id, senderId: session.userId, content: content || '', imageUrl: imageUrl || null },
      include: { sender: { select: { id: true, name: true, role: true, avatar: true, gender: true } } },
    })

    // Auto-update ticket status to IN_PROGRESS when staff replies
    if (session.role !== 'STUDENT') {
      await prisma.supportTicket.update({
        where: { id: params.id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    // Trigger support reply notification (non-blocking)
    if (session.role !== 'STUDENT') {
      sendSupportReplyNotification(params.id, session.name, reply.content).catch(console.error)
    } else {
      sendTicketReplyNotificationToManagers(params.id, session.name, reply.content).catch(console.error)
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { replyId, content } = await request.json()
    if (!replyId) return NextResponse.json({ error: 'replyId is required' }, { status: 400 })

    const reply = await prisma.ticketReply.findUnique({
      where: { id: replyId }
    })

    if (!reply || reply.ticketId !== params.id) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }

    if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers can edit support replies' }, { status: 403 })
    }

    if (reply.senderId !== session.userId) {
      return NextResponse.json({ error: 'You can only edit your own replies' }, { status: 403 })
    }

    const updated = await prisma.ticketReply.update({
      where: { id: replyId },
      data: { content: content || '' },
      include: { sender: { select: { id: true, name: true, role: true, avatar: true, gender: true } } },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TICKET_UPDATED,
      actionDescription: `${session.name} edited their reply in ticket ${params.id}`,
      moduleName: MODULE.SUPPORT,
      targetId: params.id,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating reply:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { replyId } = await request.json()
    if (!replyId) return NextResponse.json({ error: 'replyId is required' }, { status: 400 })

    const reply = await prisma.ticketReply.findUnique({
      where: { id: replyId }
    })

    if (!reply || reply.ticketId !== params.id) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }

    if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers can delete support replies' }, { status: 403 })
    }

    if (reply.senderId !== session.userId) {
      return NextResponse.json({ error: 'You can only delete your own replies' }, { status: 403 })
    }

    await prisma.ticketReply.delete({
      where: { id: replyId }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TICKET_UPDATED,
      actionDescription: `${session.name} deleted their reply in ticket ${params.id}`,
      moduleName: MODULE.SUPPORT,
      targetId: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting reply:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


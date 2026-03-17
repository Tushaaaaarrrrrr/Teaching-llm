import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

const ticketInclude = {
  user: { select: { id: true, name: true, role: true } },
  class: { select: { id: true, name: true, color: true } },
  assignedTo: { select: { id: true, name: true, role: true } },
  replies: {
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: ticketInclude,
    })

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // IDOR Check: Only the student who created it or a Manager/Assigned Admin can view
    const isOwner = ticket.studentId === session.userId
    const isAssigned = ticket.assignedToId === session.userId
    const canAccess = isOwner || isAssigned || isManager(session.role)

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(ticket)
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

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id }
    })

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // IDOR Check: Only the student, assigned agent, or manager can update
    const isOwner = ticket.studentId === session.userId
    const isAssigned = ticket.assignedToId === session.userId
    const hasAccess = isOwner || isAssigned || isManager(session.role)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { status, assignedToId } = await request.json()

    // Status can be updated by owner (maybe to closed) or staff
    // Assignment can only be changed by Manager
    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (assignedToId !== undefined) {
      if (!isManager(session.role)) {
        return NextResponse.json({ error: 'Unauthorized assignment' }, { status: 403 })
      }
      data.assignedToId = assignedToId || null
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: params.id },
      data,
      include: {
        user: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        replies: {
          include: { sender: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TICKET_UPDATED,
      actionDescription: `${session.name} updated support ticket`,
      moduleName: MODULE.SUPPORT,
      targetId: params.id,
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      select: { title: true, studentId: true },
    })

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Only managers or the owner can delete (though UI might only show for managers)
    if (!isManager(session.role) && ticket.studentId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.supportTicket.delete({ where: { id: params.id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TICKET_DELETED,
      actionDescription: `${session.name} deleted support ticket "${ticket?.title}"`,
      moduleName: MODULE.SUPPORT,
      targetId: params.id,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

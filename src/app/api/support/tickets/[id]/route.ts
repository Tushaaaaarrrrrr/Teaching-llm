import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireTicketAccess, ticketInclude } from '@/lib/support-ticket-access'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await requireTicketAccess(params.id)
    if (access.error) return access.error
    return NextResponse.json(access.ticket)
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
    const access = await requireTicketAccess(params.id)
    if (access.error) return access.error
    const session = access.session!
    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, assignedToId } = body

    if (status !== undefined && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid ticket status' }, { status: 400 })
    }
    if (assignedToId) {
      if (typeof assignedToId !== 'string') return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
      const manager = await prisma.user.findFirst({ where: { id: assignedToId, role: 'MANAGER', isTerminated: false } })
      if (!manager) return NextResponse.json({ error: 'Assign tickets to an active manager' }, { status: 400 })
    }
    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (assignedToId !== undefined) {
      data.assignedToId = assignedToId || null
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: params.id },
      data,
      include: ticketInclude,
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

    return NextResponse.json(ticket)
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
    const access = await requireTicketAccess(params.id)
    if (access.error) return access.error
    const session = access.session!
    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      select: { title: true },
    })

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

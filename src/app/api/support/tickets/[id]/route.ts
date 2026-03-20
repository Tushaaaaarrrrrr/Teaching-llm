import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, role: true } },
        course: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        replies: {
          include: { sender: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Access check: Student, assigned Agent, or Manager
    if (session.userId !== ticket.studentId && 
        session.userId !== ticket.assignedToId && 
        !isManager(session.role)) {
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

    const ticketToUpdate = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      select: { studentId: true, assignedToId: true }
    })

    if (!ticketToUpdate) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Access check: Student (can only close own?), assigned Agent, or Manager
    // Usually only staff updates status/assignee
    if (session.userId !== ticketToUpdate.studentId && 
        session.userId !== ticketToUpdate.assignedToId && 
        !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, assignedToId } = body

    // Only managers can assign tickets
    const data: Record<string, unknown> = {}
    if (status !== undefined) {
      // Students can only set status to CLOSED (if they want to close their own)
      if (session.role === 'STUDENT' && status !== 'CLOSED') {
        return NextResponse.json({ error: 'Students can only close their own tickets' }, { status: 403 })
      }
      data.status = status
    }
    
    if (assignedToId !== undefined) {
      if (!isManager(session.role)) {
        return NextResponse.json({ error: 'Only managers can assign tickets' }, { status: 403 })
      }
      data.assignedToId = assignedToId || null
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: params.id },
      data,
      include: {
        user: { select: { id: true, name: true, role: true } },
        course: { select: { id: true, name: true, color: true } },
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
    const session = await getSession()
    if (!session || !isManager(session.role)) {
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

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { status, assignedToId } = body

    // Only managers can assign tickets
    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
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

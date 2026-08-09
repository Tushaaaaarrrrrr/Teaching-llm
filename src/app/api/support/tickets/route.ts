import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { sendNewTicketNotificationToManagers } from '@/lib/system-notifications'

const ticketInclude = {
  user: { select: { id: true, name: true, role: true, avatar: true, gender: true } },
  course: { select: { id: true, name: true, color: true } },
  assignedTo: { select: { id: true, name: true, role: true, avatar: true, gender: true } },
  replies: {
    include: { sender: { select: { id: true, name: true, role: true, avatar: true, gender: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let where: Record<string, unknown> = {}

    if (session.role === 'STUDENT' || session.role === 'ADMIN') {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      where = {
        studentId: session.userId,
        OR: [
          { status: { notIn: ['CLOSED', 'RESOLVED'] } },
          { 
            status: { in: ['CLOSED', 'RESOLVED'] }, 
            updatedAt: { gte: fifteenDaysAgo } 
          }
        ]
      }
    }
    // MANAGER sees everything

    if (status) where = { ...where, status }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: ticketInclude,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, description, type, courseId, priority } = await request.json()

    const ticket = await prisma.supportTicket.create({
      data: {
        title: title || (description ? description.slice(0, 50) : 'Support Request'),
        description,
        type: type || 'GENERAL',
        courseId: type === 'SUBJECT' ? courseId : null,
        priority: priority || 'MEDIUM',
        studentId: session.userId,
      },
      include: ticketInclude,
    })

    sendNewTicketNotificationToManagers(ticket.id, session.name, ticket.title).catch(console.error)

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TICKET_CREATED,
      actionDescription: `${session.name} created support ticket "${title}"`,
      moduleName: MODULE.SUPPORT,
      targetId: ticket.id,
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

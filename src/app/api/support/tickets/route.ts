import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { validateLength, sanitizeInput } from '@/lib/validation'

const ticketInclude = {
  user: { select: { id: true, name: true, role: true } },
  course: { select: { id: true, name: true, color: true } },
  assignedTo: { select: { id: true, name: true, role: true } },
  replies: {
    include: { sender: { select: { id: true, name: true, role: true } } },
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

    if (session.role === 'STUDENT') {
      where = { studentId: session.userId }
    } else if (session.role === 'ADMIN') {
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      where = {
        OR: [
          { assignedToId: session.userId },
          { courseId: { in: accessibleCourseIds || [] } },
        ],
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
 
    if (!title || !validateLength(title, 200)) {
      return NextResponse.json({ error: 'Ticket title must be between 1 and 200 characters' }, { status: 400 })
    }
 
    if (!description || !validateLength(description, 5000)) {
      return NextResponse.json({ error: 'Ticket description must be between 1 and 5,000 characters' }, { status: 400 })
    }

    const sanitizedTitle = sanitizeInput(title)
    const sanitizedDescription = sanitizeInput(description)

    const ticket = await prisma.supportTicket.create({
      data: {
        title: sanitizedTitle,
        description: sanitizedDescription,
        type: type || 'GENERAL',
        courseId: type === 'SUBJECT' ? courseId : null,
        priority: priority || 'MEDIUM',
        studentId: session.userId,
      },
      include: ticketInclude,
    })

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

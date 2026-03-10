import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let where: Record<string, unknown> = {}

    if (session.role === 'STUDENT') {
      // Students only see their own tickets
      where = { studentId: session.userId }
    } else if (session.role === 'ADMIN') {
      // Admins see tickets for classes they manage OR general tickets
      const adminClasses = await prisma.class.findMany({
        where: { createdById: session.userId },
        select: { id: true },
      })
      const classIds = adminClasses.map(c => c.id)
      where = {
        OR: [
          { type: 'GENERAL' },
          { classId: { in: classIds } },
        ],
      }
    }
    // MANAGER sees all tickets (no filter)

    if (status) where = { ...where, status }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true, color: true } },
        replies: {
          include: { sender: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
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

    const { title, description, type, classId, priority } = await request.json()

    const ticket = await prisma.supportTicket.create({
      data: {
        title,
        description,
        type: type || 'GENERAL',
        classId: type === 'SUBJECT' ? classId : null,
        priority: priority || 'MEDIUM',
        studentId: session.userId,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true, color: true } },
        replies: true,
      },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

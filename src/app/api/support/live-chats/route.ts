import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let where: Record<string, unknown> = {}
    if (session.role === 'STUDENT') {
      where = { studentId: session.userId }
    }
    // Admins/Managers see all WAITING/ACTIVE chats

    const chats = await prisma.chatSession.findMany({
      where: { ...where, status: { not: 'CLOSED' } },
      include: {
        student: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(chats)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can start a chat' }, { status: 403 })
    }

    // Check if student already has an active chat
    const existing = await prisma.chatSession.findFirst({
      where: { studentId: session.userId, status: { not: 'CLOSED' } },
    })
    if (existing) return NextResponse.json(existing)

    const chat = await prisma.chatSession.create({
      data: { studentId: session.userId, status: 'WAITING' },
      include: {
        student: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

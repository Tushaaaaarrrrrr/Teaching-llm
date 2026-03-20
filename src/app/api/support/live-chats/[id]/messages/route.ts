import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const chat = await prisma.chatSession.findUnique({
      where: { id: params.id },
      select: { studentId: true, agentId: true }
    })

    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })

    // Access check: Student or assigned Agent
    if (session.userId !== chat.studentId && session.userId !== chat.agentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatId: params.id },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
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

    const chat = await prisma.chatSession.findUnique({
      where: { id: params.id },
      select: { studentId: true, agentId: true, status: true }
    })

    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })

    // Access check: Student or assigned Agent
    if (session.userId !== chat.studentId && session.userId !== chat.agentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (chat.status === 'CLOSED') {
      return NextResponse.json({ error: 'Chat is closed' }, { status: 400 })
    }

    const { content } = await request.json()

    const message = await prisma.chatMessage.create({
      data: { chatId: params.id, senderId: session.userId, content },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    // Bump updatedAt on the session for ordering
    await prisma.chatSession.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

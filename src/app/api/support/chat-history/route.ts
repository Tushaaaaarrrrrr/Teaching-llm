import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ONLY show closed SUPPORT chats — never DIRECT (community DMs)
    const sessions = await prisma.chatSession.findMany({
      where: { type: 'SUPPORT', status: 'CLOSED' },
      include: {
        student: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

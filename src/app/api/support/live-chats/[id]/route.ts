import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

// Agent joins or closes a chat
export async function PUT(
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

    const { action } = await request.json()

    // Access check: Student, assigned Agent, or Manager/Admin joining
    if (action === 'join') {
      if (!isAdminOrManager(session.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (chat.agentId) {
        return NextResponse.json({ error: 'Agent already assigned' }, { status: 400 })
      }
    } else if (action === 'close') {
      // Only the student or the assigned agent can close the chat
      if (session.userId !== chat.studentId && session.userId !== chat.agentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    let data: Record<string, unknown> = {}
    if (action === 'join') {
      data = { agentId: session.userId, status: 'ACTIVE' }
    } else if (action === 'close') {
      data = { status: 'CLOSED' }
    }

    const updatedChat = await prisma.chatSession.update({
      where: { id: params.id },
      data,
      include: {
        student: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, role: true } },
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: action === 'join' ? ACTION.CHAT_JOINED : ACTION.CHAT_CLOSED,
      actionDescription: `${session.name} ${action === 'join' ? 'joined' : 'closed'} a live chat session`,
      moduleName: MODULE.SUPPORT,
      targetId: params.id,
    })

    return NextResponse.json(updatedChat)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

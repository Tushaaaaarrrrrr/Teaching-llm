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

    const { action } = await request.json()

    let data: Record<string, unknown> = {}
    if (action === 'join' && isAdminOrManager(session.role)) {
      data = { agentId: session.userId, status: 'ACTIVE' }
    } else if (action === 'close') {
      data = { status: 'CLOSED' }
    }

    const chat = await prisma.chatSession.update({
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

    return NextResponse.json(chat)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

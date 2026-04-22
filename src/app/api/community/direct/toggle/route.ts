import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Only managers can toggle direct chats' }, { status: 403 })
    }

    const { chatId, action } = await request.json()
    if (!chatId || !['disable', 'enable'].includes(action)) {
      return NextResponse.json({ error: 'chatId and action (disable/enable) are required' }, { status: 400 })
    }

    const chat = await prisma.chatSession.findUnique({
      where: { id: chatId },
      include: { student: { select: { name: true } } },
    })
    if (!chat || chat.type !== 'DIRECT') {
      return NextResponse.json({ error: 'Direct chat not found' }, { status: 404 })
    }
    if (chat.agentId !== session.userId) {
      return NextResponse.json({ error: 'You can only manage your own direct chats' }, { status: 403 })
    }

    const newStatus = action === 'disable' ? 'DISABLED' : 'ACTIVE'
    await prisma.chatSession.update({
      where: { id: chatId },
      data: { status: newStatus },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CHAT_STARTED,
      actionDescription: `${session.name} ${action}d direct chat with ${chat.student.name}`,
      moduleName: MODULE.COMMUNITY,
      targetId: chatId,
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

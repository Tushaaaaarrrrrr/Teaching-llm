import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Only managers can start direct chats' }, { status: 403 })
    }

    const { studentId } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, role: true, isTerminated: true, avatar: true, gender: true },
    })
    if (!student || student.isTerminated) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    if (student.role === 'MANAGER') {
      return NextResponse.json({ error: 'Cannot start a direct chat with another manager' }, { status: 400 })
    }

    // Check if active DIRECT chat already exists between this manager and student
    const existing = await prisma.chatSession.findFirst({
      where: {
        studentId,
        agentId: session.userId,
        type: 'DIRECT',
        status: { not: 'CLOSED' },
      },
    })
    if (existing) {
      return NextResponse.json({ chatId: `dm_${existing.id}`, existing: true })
    }

    // DIRECT chats have no expiration — they are persistent
    const chat = await prisma.chatSession.create({
      data: {
        studentId,
        agentId: session.userId,
        status: 'ACTIVE',
        type: 'DIRECT',
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CHAT_STARTED,
      actionDescription: `${session.name} started a direct chat with ${student.name}`,
      moduleName: MODULE.COMMUNITY,
      targetId: chat.id,
    })

    return NextResponse.json({ chatId: `dm_${chat.id}`, existing: false }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

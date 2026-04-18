import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

const CHAT_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

async function autoExpireChats() {
  const now = new Date()
  await prisma.chatSession.updateMany({
    where: {
      status: { not: 'CLOSED' },
      expiresAt: { lte: now },
    },
    data: { status: 'CLOSED' },
  })
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await autoExpireChats()

    if (session.role === 'STUDENT') {
      where = { studentId: session.userId }
    } else {
      // Admins and Managers see chats that have at least one message OR chats they initiated
      where = {
        OR: [
          { messages: { some: {} } },
          { agentId: session.userId }
        ]
      }
    }

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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'STUDENT' && session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { initialMessage, studentId } = await request.json().catch(() => ({}))
    const isManagerInitiated = session.role !== 'STUDENT'
    const targetStudentId = isManagerInitiated ? studentId : session.userId

    if (isManagerInitiated && !targetStudentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + CHAT_TTL_MS)
    const chat = await prisma.chatSession.create({
      data: { 
        studentId: targetStudentId, 
        status: isManagerInitiated ? 'ACTIVE' : 'WAITING', 
        agentId: isManagerInitiated ? session.userId : null,
        expiresAt,
        ...(initialMessage ? {
          messages: {
            create: {
              content: initialMessage,
              senderId: session.userId
            }
          }
        } : {})
      },
      include: {
        student: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, role: true } },
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CHAT_STARTED,
      actionDescription: `${session.name} started a live chat session`,
      moduleName: MODULE.SUPPORT,
      targetId: chat.id,
    })

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

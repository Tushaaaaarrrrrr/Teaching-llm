import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { sseEmitter } from '@/lib/sse'

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const session = await getSession()
    
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Direct Message clear ─────────────────────────────────────────────────
    if (courseId.startsWith('dm_')) {
      const id = courseId.slice(3)
      const chat = await prisma.chatSession.findUnique({ where: { id } })
      if (!chat || chat.agentId !== session.userId) {
        return NextResponse.json({ error: 'You can only clear your own direct chats' }, { status: 403 })
      }
      const result = await prisma.chatMessage.updateMany({
        where: { chatId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      })
      logActivity({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        actionType: ACTION.MESSAGE_DELETED,
        actionDescription: `${session.name} cleared all messages in a direct chat`,
        moduleName: MODULE.COMMUNITY,
        targetId: courseId,
      })
      sseEmitter.emit(`chat:${courseId}:clear`)
      return NextResponse.json({ success: true, count: result.count })
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true }
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const result = await prisma.communityMessage.updateMany({
      where: { courseId, isDeleted: false, isSystemDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MESSAGE_DELETED,
      actionDescription: `${session.name} cleared all messages in ${course.name} community`,
      moduleName: MODULE.COMMUNITY,
      targetId: courseId,
      metadata: { count: result.count }
    })

    sseEmitter.emit(`chat:${courseId}:clear`)
    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('[COMMUNITY_CLEAR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

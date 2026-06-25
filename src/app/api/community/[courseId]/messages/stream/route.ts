import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { sseEmitter } from '@/lib/sse'

export const dynamic = 'force-dynamic'

function isDM(courseId: string) { return courseId.startsWith('dm_') }
function chatId(courseId: string) { return courseId.slice(3) }

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { courseId } = params

  // ── Direct Message stream ────────────────────────────────────────────────
  if (isDM(courseId)) {
    const id = chatId(courseId)
    const chat = await prisma.chatSession.findUnique({
      where: { id },
      select: { studentId: true, agentId: true },
    })
    if (!chat) return new Response('Chat not found', { status: 404 })

    // Only the student or agent (manager) can stream this DM
    if (chat.studentId !== session.userId && chat.agentId !== session.userId && session.role !== 'MANAGER') {
      return new Response('Forbidden', { status: 403 })
    }

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('event: connected\ndata: ok\n\n')

        const onMessage = (msg: any) => {
          controller.enqueue(`event: message\ndata: ${JSON.stringify(msg)}\n\n`)
        }
        const onDelete = (messageId: string) => {
          controller.enqueue(`event: delete\ndata: ${JSON.stringify({ messageId })}\n\n`)
        }
        const onClear = () => {
          controller.enqueue(`event: clear\ndata: {}\n\n`)
        }

        sseEmitter.on(`chat:${courseId}:message`, onMessage)
        sseEmitter.on(`chat:${courseId}:delete`, onDelete)
        sseEmitter.on(`chat:${courseId}:clear`, onClear)

        request.signal.addEventListener('abort', () => {
          sseEmitter.off(`chat:${courseId}:message`, onMessage)
          sseEmitter.off(`chat:${courseId}:delete`, onDelete)
          sseEmitter.off(`chat:${courseId}:clear`, onClear)
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  }

  // ── Community stream ─────────────────────────────────────────────────────
  const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
  if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
    return new Response('Forbidden', { status: 403 })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { isCommunityActive: true },
  })
  if (!course) return new Response('Course not found', { status: 404 })
  if (!course.isCommunityActive && session.role !== 'MANAGER') {
    return new Response('This community is currently disabled', { status: 403 })
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('event: connected\ndata: ok\n\n')

      const onMessage = (msg: any) => {
        const safeEvent = { ...msg }
        if (session.role !== 'MANAGER' && safeEvent.sender) {
          safeEvent.sender = { ...safeEvent.sender }
          delete safeEvent.sender.securityNumber
        }
        controller.enqueue(`event: message\ndata: ${JSON.stringify(safeEvent)}\n\n`)
      }
      const onDelete = (messageId: string) => {
        controller.enqueue(`event: delete\ndata: ${JSON.stringify({ messageId })}\n\n`)
      }
      const onClear = () => {
        controller.enqueue(`event: clear\ndata: {}\n\n`)
      }
      const onPin = (pinData: { messageId: string | null }) => {
        controller.enqueue(`event: pin\ndata: ${JSON.stringify(pinData)}\n\n`)
      }

      sseEmitter.on(`chat:${courseId}:message`, onMessage)
      sseEmitter.on(`chat:${courseId}:delete`, onDelete)
      sseEmitter.on(`chat:${courseId}:clear`, onClear)
      sseEmitter.on(`chat:${courseId}:pin`, onPin)

      request.signal.addEventListener('abort', () => {
        sseEmitter.off(`chat:${courseId}:message`, onMessage)
        sseEmitter.off(`chat:${courseId}:delete`, onDelete)
        sseEmitter.off(`chat:${courseId}:clear`, onClear)
        sseEmitter.off(`chat:${courseId}:pin`, onPin)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

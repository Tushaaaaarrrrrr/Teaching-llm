import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { sseEmitter } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { courseId } = params

  const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
  if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
    return new Response('Forbidden', { status: 403 })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { isCommunityActive: true },
  })
  
  if (!course) {
    return new Response('Course not found', { status: 404 })
  }
  
  if (!course.isCommunityActive && session.role !== 'MANAGER') {
    return new Response('This community is currently disabled', { status: 403 })
  }

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue('event: connected\ndata: ok\n\n')

      const onMessage = (msg: any) => {
        // Strip out the security number if the connected user is a student
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

      sseEmitter.on(`chat:${courseId}:message`, onMessage)
      sseEmitter.on(`chat:${courseId}:delete`, onDelete)
      sseEmitter.on(`chat:${courseId}:clear`, onClear)

      // When client connection drops, clean up listeners right away
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

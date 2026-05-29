import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { sseEmitter } from '@/lib/sse'
import { sendFcmToUsers } from '@/lib/fcm'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // attemptId
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { isPublished } = await request.json()

    const attempt = await (prisma.examAttempt as any).findUnique({
      where: { id },
      include: { exam: { select: { title: true } } }
    })

    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    const updatedAttempt = await (prisma.examAttempt as any).update({
      where: { id },
      data: { isPublished: !!isPublished }
    })

    // Notify if publishing for the first time or re-publishing
    if (!!isPublished && !attempt.isPublished) {
      await prisma.notification.create({
        data: {
          userId: attempt.userId,
          title: 'Exam Result Published',
          content: `The final result for "${attempt.exam.title}" is now available for review.`,
          type: 'INFO'
        }
      })
      
      // Notify connected client via SSE
      sseEmitter.emit(`user:${attempt.userId}:notify`)

      // Send FCM push notification to the student
      sendFcmToUsers([attempt.userId], {
        title: '📊 Exam Result Published',
        body: `Your result for "${attempt.exam.title}" is now available for review.`,
        url: `/exams/${attempt.examId}/result`,
        tag: `exam-result-${attempt.id}`,
      }).catch(console.error)
    }

    return NextResponse.json(updatedAttempt)
  } catch (error) {
    console.error('Error publishing attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { sseEmitter } from '@/lib/sse'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // attemptId
) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { evaluations, feedback, isPublished } = await request.json()
    // evaluations: Array of { responseId: string, marks: number, feedback?: string }

    if (evaluations && !Array.isArray(evaluations)) {
      return NextResponse.json({ error: 'Invalid evaluations data' }, { status: 400 })
    }

    // Update each response
    if (evaluations) {
      for (const evalItem of evaluations) {
        await prisma.examResponse.update({
          where: { id: evalItem.responseId },
          data: { 
            marks: evalItem.marks,
            feedback: evalItem.feedback
          }
        })
      }
    }

    // Recalculate total marks
    const attempt = await (prisma.examAttempt as any).findUnique({
      where: { id },
      include: { responses: true }
    })

    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    const totalMarks = attempt.responses.reduce((acc: number, r: any) => acc + (r.marks || 0), 0)

    const updatedAttempt = await (prisma.examAttempt as any).update({
      where: { id },
      data: {
        totalMarks,
        isEvaluated: true,
        isPublished: isPublished !== undefined ? !!isPublished : attempt.isPublished,
        feedback: feedback !== undefined ? feedback : attempt.feedback
      },
      include: { exam: { select: { title: true } } }
    })

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: updatedAttempt.userId,
        title: 'Exam Feedback Received',
        content: `Your submission for "${updatedAttempt.exam.title}" has been reviewed by the instructor.`,
        type: 'SUCCESS'
      }
    })
    
    // Notify connected client
    sseEmitter.emit(`user:${updatedAttempt.userId}:notify`)

    return NextResponse.json(updatedAttempt)
  } catch (error) {
    console.error('Error evaluating attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

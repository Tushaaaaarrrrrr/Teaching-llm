import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, expiresAt: true, isPublished: true },
    })
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }
    if (!exam.isPublished) {
      return NextResponse.json({ error: 'Exam is not active' }, { status: 403 })
    }
    if (new Date() > new Date(exam.expiresAt)) {
      return NextResponse.json({ error: 'Exam has expired and can no longer be submitted' }, { status: 403 })
    }

    const attempt = await prisma.examAttempt.findFirst({
      where: { examId: params.id, userId: session.userId, submittedAt: null },
      orderBy: { startedAt: 'desc' },
      include: { exam: { include: { questions: true } } }
    })

    if (!attempt || attempt.submittedAt) {
      return NextResponse.json({ error: 'No active attempt found to submit' }, { status: 400 })
    }

    // Final grading for auto-gradable questions (MCQ, etc.)
    const responses = await prisma.examResponse.findMany({
      where: { attemptId: attempt.id }
    })

    let totalMarks = 0
    let fullyAutoGraded = true

    for (const q of attempt.exam.questions) {
      const resp = responses.find(r => r.questionId === q.id)
      if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
        if (resp && resp.answer === q.correctAnswer) {
          totalMarks += q.marks
          // Update the response marks
          await prisma.examResponse.update({
            where: { id: resp.id },
            data: { marks: q.marks }
          })
        } else if (resp) {
          await prisma.examResponse.update({
            where: { id: resp.id },
            data: { marks: 0 }
          })
        }
      } else {
        fullyAutoGraded = false
      }
    }

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        submittedAt: new Date(),
        totalMarks: fullyAutoGraded ? totalMarks : null,
        isEvaluated: fullyAutoGraded
      }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EXAM_SUBMITTED,
      actionDescription: `${session.name} submitted exam "${attempt.exam.title}"`,
      moduleName: MODULE.EXAMS,
      targetId: attempt.exam.id
    })

    return NextResponse.json(updatedAttempt)
  } catch (error) {
    console.error('Error submitting exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

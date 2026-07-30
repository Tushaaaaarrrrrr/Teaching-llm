import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { allowsMultipleAttempts } from '@/lib/exam-policy'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        courseId: true,
        testSeriesId: true,
        isPublished: true,
        expiresAt: true,
        examType: true,
      }
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (!exam.isPublished) {
      return NextResponse.json({ error: 'Exam is not active' }, { status: 403 })
    }

    if (new Date() > new Date(exam.expiresAt)) {
      return NextResponse.json({ error: 'Exam has expired' }, { status: 403 })
    }

    // Check access
    if (session.role === 'STUDENT') {
      if (exam.courseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: session.userId, courseId: exam.courseId } }
        })
        if (!enrollment) {
          return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
        }
        if (enrollment.type === 'DEMO') {
          return NextResponse.json({ error: 'Exams are locked in Demo mode. Unlock full course to attempt exams.' }, { status: 403 })
        }
      } else if (exam.testSeriesId) {
        const tsAccess = await (prisma as any).testSeriesAccess.findFirst({
          where: { 
            userId: session.userId, 
            testSeriesId: exam.testSeriesId,
            expiresAt: { gt: new Date() }
          }
        })
        if (!tsAccess) {
          return NextResponse.json({ error: 'You do not have access to this test series' }, { status: 403 })
        }
      } else {
        // Standalone exam with no course or test series? Usually shouldn't happen for students
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Start or resume attempt
    let attempt = await prisma.examAttempt.findFirst({
      where: { examId: id, userId: session.userId },
      orderBy: { startedAt: 'desc' },
      include: { responses: true }
    })

    if (!attempt || attempt.submittedAt) {
      if (attempt?.submittedAt) {
        if (!allowsMultipleAttempts((exam as any).examType)) {
          return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 })
        } else {
          // GENERAL_TEST Cooldown check
          const submittedTime = new Date(attempt.submittedAt).getTime();
          const cooldownMs = 5 * 60 * 1000;
          if (Date.now() < submittedTime + cooldownMs) {
            const minutesLeft = Math.ceil((submittedTime + cooldownMs - Date.now()) / 60000);
            return NextResponse.json({ error: `Please wait ${minutesLeft} minute(s) before starting a new attempt.` }, { status: 400 })
          }
        }
      }

      attempt = await prisma.examAttempt.create({
        data: {
          examId: id,
          userId: session.userId,
        },
        include: { responses: true }
      }) as any
    }

    return NextResponse.json(attempt)
  } catch (error) {
    console.error('Error starting attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH for saving individual answers (autosave)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { questionId, answer } = await request.json()

    const attempt = await prisma.examAttempt.findFirst({
      where: { examId: id, userId: session.userId, submittedAt: null },
      orderBy: { startedAt: 'desc' }
    })

    if (!attempt || attempt.submittedAt) {
      return NextResponse.json({ error: 'No active attempt found' }, { status: 400 })
    }

    // Upsert response
    const response = await prisma.examResponse.upsert({
      where: { 
        attemptId_questionId: { 
          attemptId: attempt.id, 
          questionId 
        } 
      },
      update: { answer },
      create: {
        attemptId: attempt.id,
        questionId,
        answer
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error saving response:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

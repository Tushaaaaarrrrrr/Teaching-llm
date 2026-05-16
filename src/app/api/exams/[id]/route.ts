import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { EXAM_SUBMISSION_VISIBILITY_DELAY_MS, shouldHideAnswersForStudent } from '@/lib/exam-policy'

export async function GET(
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
      include: {
        questions: { orderBy: { order: 'asc' } },
        course: { select: { id: true, name: true, color: true, subject: true } },
      }
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Role-based logic
    if (session.role === 'STUDENT') {
      // Check if exam is published (students can't see unpublished exams)
      if (!exam.isPublished) {
        return NextResponse.json({ error: 'Exam not found or not available' }, { status: 404 })
      }

      // Check if student belongs to the course OR has test series access
      let hasAccess = false
      if (exam.courseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: session.userId, courseId: exam.courseId } }
        })
        hasAccess = !!enrollment
      }
      if (!hasAccess && (exam as any).testSeriesId) {
        const tsAccess = await (prisma as any).testSeriesAccess.findUnique({
          where: { testSeriesId_userId: { testSeriesId: (exam as any).testSeriesId, userId: session.userId } }
        })
        hasAccess = !!tsAccess && new Date(tsAccess.expiresAt) > new Date()
      }
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const attempts = await prisma.examAttempt.findMany({
        where: { examId: params.id, userId: session.userId }
      })

      const hasSubmitted = attempts.some((a: any) => a.submittedAt !== null)
      const latestAttempt = attempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
      const attemptIsPublished = latestAttempt?.isPublished || false
      
      const hasEnded = new Date() > new Date(exam.expiresAt)
      const hideAnswers = shouldHideAnswersForStudent(
        (exam as any).examType, 
        hasSubmitted, 
        hasEnded, 
        exam.isPublished,
        attemptIsPublished
      )

      if (hideAnswers) {
        exam.questions = exam.questions.map((q: any) => ({
          ...q,
          correctAnswer: null,
          explanation: null
        }))
      }

      // Hide externalId from students
      const { externalId, ...examWithoutExternalId } = exam as any
      return NextResponse.json({ ...examWithoutExternalId, attempts })
    } else {
      // ADMIN or MANAGER
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      
      // Managers (null) can see all; Admins see only their courses
      if (accessibleCourseIds !== null && !accessibleCourseIds.includes(exam.courseId)) {
        return NextResponse.json({ error: 'Unauthorized access to this course' }, { status: 401 })
      }

      // 5-minute visibility delay logic for submissions
      const now = new Date()
      // Delay: only show submissions that are older than 5 minutes
      const delayMs = EXAM_SUBMISSION_VISIBILITY_DELAY_MS
      const threshold = new Date(now.getTime() - delayMs)

      const attempts = await prisma.examAttempt.findMany({
        where: { 
          examId: params.id,
          OR: [
            { submittedAt: null }, // In Progress - visible immediately
            { submittedAt: { lte: threshold } } // Submitted - visible after 5 mins
          ]
        },
        include: { responses: true }
      })
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(new Set(attempts.map((attempt: any) => attempt.userId))) } },
        select: { id: true, name: true, email: true, securityNumber: true },
      })
      const userMap = new Map(users.map(user => [user.id, user]))

      const attemptsWithUsers = attempts.map((attempt: any) => ({
        ...attempt,
        user: userMap.get(attempt.userId) || null,
      }))

      return NextResponse.json({ ...exam, attempts: attemptsWithUsers })
    }
  } catch (error) {
    console.error('Error fetching exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const { title, description, courseId, expiresAt, startDate, durationMinutes, isPublished, questions } = payload

    const existingExam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { attempts: true } }
      },
    })
    if (!existingExam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null) {
      if (!accessibleCourseIds.includes(existingExam.courseId)) {
        return NextResponse.json({ error: 'Unauthorized access to this exam' }, { status: 403 })
      }
      if (courseId && !accessibleCourseIds.includes(courseId)) {
        return NextResponse.json({ error: 'You do not have access to move this exam to that course' }, { status: 403 })
      }
    }

    const hasNonPublishEdit = [
      title,
      description,
      courseId,
      expiresAt,
      startDate,
      durationMinutes,
      questions
    ].some(value => value !== undefined)

    if (hasNonPublishEdit && existingExam.isPublished) {
      return NextResponse.json({ error: 'Unpublish this exam before editing it' }, { status: 400 })
    }

    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: 'At least one question is required' }, { status: 400 })
      }

      if (existingExam._count.attempts > 0) {
        return NextResponse.json({ error: 'Cannot change question structure after students have started attempts' }, { status: 400 })
      }
    }

    const nextStartDate = startDate !== undefined
      ? (startDate ? new Date(startDate) : null)
      : existingExam.startDate
    const nextExpiresAt = expiresAt !== undefined
      ? (expiresAt ? new Date(expiresAt) : null)
      : existingExam.expiresAt

    if (!nextExpiresAt) {
      return NextResponse.json({ error: 'End date is required for this exam type' }, { status: 400 })
    }

    if (nextStartDate && nextExpiresAt <= nextStartDate) {
      return NextResponse.json({ error: 'End date must be later than the start date' }, { status: 400 })
    }

    const parsedDurationMinutes = durationMinutes !== undefined
      ? parseInt(String(durationMinutes), 10)
      : undefined

    if (parsedDurationMinutes !== undefined && (!Number.isFinite(parsedDurationMinutes) || parsedDurationMinutes <= 0)) {
      return NextResponse.json({ error: 'Duration must be at least 1 minute' }, { status: 400 })
    }

    const exam = await prisma.$transaction(async (tx) => {
      const updatedExam = await tx.exam.update({
        where: { id: params.id },
        data: {
          title,
          description,
          courseId,
          expiresAt: nextExpiresAt ?? undefined,
          startDate: nextStartDate,
          durationMinutes: parsedDurationMinutes,
          isPublished
        }
      })

      if (questions !== undefined) {
        await tx.examQuestion.deleteMany({
          where: { examId: params.id }
        })

        await tx.examQuestion.createMany({
          data: questions.map((q: any, index: number) => ({
            examId: params.id,
            text: q.text,
            type: q.type,
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            imageUrl: q.imageUrl,
            marks: q.marks || 1,
            order: index,
            questionBankId: q.questionBankId || null
          }))
        })
      }

      return tx.exam.findUnique({
        where: { id: updatedExam.id },
        include: {
          questions: { orderBy: { order: 'asc' } }
        }
      })
    })

    return NextResponse.json(exam)
  } catch (error) {
    console.error('Error updating exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id: params.id },
      select: { courseId: true },
    })
    if (!existingExam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(existingExam.courseId)) {
      return NextResponse.json({ error: 'Unauthorized access to this exam' }, { status: 403 })
    }

    await prisma.exam.delete({
      where: { id: params.id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

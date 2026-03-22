import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'

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
        course: { select: { id: true, name: true, color: true } },
      }
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Role-based logic
    if (session.role === 'STUDENT') {
      // Check if student belongs to the course
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.userId, courseId: exam.courseId } }
      })
      if (!enrollment) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const attempts = await prisma.examAttempt.findMany({
        where: { examId: params.id, userId: session.userId }
      })

      const hasSubmitted = attempts.some((a: any) => a.submittedAt !== null)
      
      let hideAnswers = false
      if ((exam as any).examType === 'FINAL_TEST') {
        const hasEnded = new Date() > new Date(exam.expiresAt)
        hideAnswers = !hasEnded || !exam.isPublished
      } else {
        hideAnswers = !hasSubmitted
      }

      if (hideAnswers) {
        exam.questions = exam.questions.map((q: any) => ({
          ...q,
          correctAnswer: null,
          explanation: null
        }))
      }

      return NextResponse.json({ ...exam, attempts })
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
      const delayMs = 5 * 60 * 1000
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

      return NextResponse.json({ ...exam, attempts })
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
    const { title, description, courseId, expiresAt, startDate, durationMinutes, isPublished } = payload

    const exam = await prisma.exam.update({
      where: { id: params.id },
      data: {
        title,
        description,
        courseId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        durationMinutes,
        isPublished
      }
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

    await prisma.exam.delete({
      where: { id: params.id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

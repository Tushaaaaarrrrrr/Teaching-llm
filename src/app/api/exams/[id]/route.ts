import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

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
        course: { select: { name: true, color: true } },
        attempts: { where: { userId: session.userId } }
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

      // If student hasn't submitted yet, hide correct answers and explanations
      const hasSubmitted = exam.attempts.some(a => a.submittedAt !== null)
      if (!hasSubmitted) {
        exam.questions = exam.questions.map((q: any) => ({
          ...q,
          correctAnswer: null,
          explanation: null
        }))
      }
    }

    return NextResponse.json(exam)
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

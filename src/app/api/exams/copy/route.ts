import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { randomUUID } from 'crypto'

// POST: Deep copy an exam to another course or test series
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { examId, destinationType, destinationId } = await request.json()

    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 })
    }
    if (!destinationType || !['course', 'testSeries'].includes(destinationType)) {
      return NextResponse.json({ error: 'destinationType must be "course" or "testSeries"' }, { status: 400 })
    }
    if (!destinationId) {
      return NextResponse.json({ error: 'destinationId is required' }, { status: 400 })
    }

    // Fetch the source exam with all questions
    const sourceExam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: { orderBy: { order: 'asc' } }
      }
    })

    if (!sourceExam) {
      return NextResponse.json({ error: 'Source exam not found' }, { status: 404 })
    }

    // Verify destination exists
    if (destinationType === 'course') {
      const course = await prisma.course.findUnique({ where: { id: destinationId } })
      if (!course) return NextResponse.json({ error: 'Destination course not found' }, { status: 404 })
    } else {
      const ts = await (prisma as any).testSeries.findUnique({ where: { id: destinationId } })
      if (!ts) return NextResponse.json({ error: 'Destination test series not found' }, { status: 404 })
    }

    // Deep copy the exam
    const newExam = await prisma.$transaction(async (tx) => {
      const exam = await (tx.exam as any).create({
        data: {
          externalId: randomUUID(),
          title: `${sourceExam.title} (Copy)`,
          description: sourceExam.description,
          courseId: destinationType === 'course' ? destinationId : null,
          testSeriesId: destinationType === 'testSeries' ? destinationId : null,
          expiresAt: sourceExam.expiresAt,
          startDate: sourceExam.startDate,
          durationMinutes: sourceExam.durationMinutes,
          examType: sourceExam.examType,
          isPublished: false, // Start unpublished so manager can review
          createdById: session.userId,
          questions: {
            create: sourceExam.questions.map((q: any) => ({
              text: q.text,
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              imageUrl: q.imageUrl,
              marks: q.marks,
              order: q.order,
              questionBankId: q.questionBankId
            }))
          }
        },
        include: {
          questions: true,
          course: { select: { id: true, name: true } }
        }
      })

      return exam
    })

    return NextResponse.json({
      exam: newExam,
      message: `Exam copied successfully with ${sourceExam.questions.length} questions`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error copying exam:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

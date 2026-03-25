import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

async function getAccessibleSubjects(userId: string) {
  const enrollments = await (prisma as any).enrollment.findMany({
    where: { userId },
    include: { course: { select: { subject: true } } }
  }) as any[]
  const assignments = await (prisma as any).instructorAssignment.findMany({
    where: { instructorId: userId },
    include: { course: { select: { subject: true } } }
  }) as any[]

  return new Set([
    ...enrollments.map(e => e.course?.subject),
    ...assignments.map(a => a.course?.subject)
  ].filter(Boolean))
}

async function canAdminManageQuestion(userId: string, subject: string) {
  const accessibleSubjects = await getAccessibleSubjects(userId)
  return accessibleSubjects.has(subject)
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

    const existingQuestion = await (prisma as any).questionBank.findUnique({
      where: { id: params.id }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const { text, type, subject, options, correctAnswer, explanation, imageUrl, marks } = await request.json()

    if (!text || !subject || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (session.role === 'ADMIN') {
      const canManageExisting = await canAdminManageQuestion(session.userId, existingQuestion.subject)
      const canManageTarget = await canAdminManageQuestion(session.userId, subject)

      if (!canManageExisting || !canManageTarget) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const question = await (prisma as any).questionBank.update({
      where: { id: params.id },
      data: {
        text,
        type,
        subject,
        options: options || null,
        correctAnswer,
        explanation,
        imageUrl,
        marks: marks ? parseInt(marks) : 1
      }
    })

    return NextResponse.json(question)
  } catch (error) {
    console.error('Error updating content bank question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingQuestion = await (prisma as any).questionBank.findUnique({
      where: { id: params.id }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (session.role === 'ADMIN') {
      const canManageExisting = await canAdminManageQuestion(session.userId, existingQuestion.subject)
      if (!canManageExisting) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await (prisma as any).questionBank.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting content bank question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

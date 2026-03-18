import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')

    let where: any = {}

    if (session.role === 'ADMIN') {
      // Admins only see subjects related to their classes
      const enrollments = await (prisma as any).enrollment.findMany({
        where: { userId: session.userId },
        include: { course: { select: { subject: true } } }
      }) as any[]
      const assignments = await (prisma as any).instructorAssignment.findMany({
        where: { instructorId: session.userId },
        include: { course: { select: { subject: true } } }
      }) as any[]
      
      const accessibleSubjects = new Set([
        ...enrollments.map(e => e.course?.subject),
        ...assignments.map(a => a.course?.subject)
      ].filter(Boolean))

      if (subject) {
        if (!accessibleSubjects.has(subject)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        where.subject = subject
      } else {
        where.subject = { in: Array.from(accessibleSubjects) }
      }
    } else if (subject) {
      where.subject = subject
    }

    const questions = await (prisma as any).questionBank.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.error('Error fetching content bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
  const session = await getSession()
  if (!session || !isAdminOrManager(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text, type, subject, options, correctAnswer, explanation, imageUrl } = await request.json()

  if (!text || !subject || !correctAnswer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Role-based restrictions for Admins
  if (session.role === 'ADMIN') {
    const enrollments = await (prisma as any).enrollment.findMany({
      where: { userId: session.userId },
      include: { course: { select: { subject: true } } }
    }) as any[]
    const assignments = await (prisma as any).instructorAssignment.findMany({
      where: { instructorId: session.userId },
      include: { course: { select: { subject: true } } }
    }) as any[]
    
    const accessibleSubjects = new Set([
      ...enrollments.map(e => e.course?.subject),
      ...assignments.map(a => a.course?.subject)
    ].filter(Boolean))

    if (!accessibleSubjects.has(subject)) {
      return NextResponse.json({ error: 'Forbidden: You can only add questions for your assigned subjects' }, { status: 403 })
    }
  }

    const question = await (prisma as any).questionBank.create({
      data: {
        text,
        type,
        subject,
        options: options || null,
        correctAnswer,
        explanation,
        imageUrl,
        createdById: session.userId,
      }
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error('Error creating question in bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

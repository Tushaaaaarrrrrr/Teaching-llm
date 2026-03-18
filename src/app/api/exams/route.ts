import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    let where: any = {}

    if (session.role === 'STUDENT') {
      // Students only see published exams in their courses
      const user = (await prisma.user.findUnique({
    where: { id: session.userId },
    select: { 
      id: true, name: true, email: true, role: true, avatar: true, createdAt: true, 
      canTerminate: true, canCreateStudents: true,
      enrollments: {
        select: {
          course: {
            select: { id: true, name: true, subject: true }
          }
        }
      }
    } as any,
  })) as any
      const courseIds = user?.enrollments.map((e: any) => e.course.id) || []
      
      where = {
        courseId: { in: courseIds },
        isPublished: true,
      }
    } else if (session.role === 'ADMIN') {
      // Admins only see exams for their assigned subjects
      const admin = (await prisma.user.findUnique({
        where: { id: session.userId },
        include: { enrollments: { include: { course: { select: { subject: true } } } } } as any
      })) as any
      const subjects = admin?.enrollments.map((e: any) => e.course.subject).filter(Boolean) as string[]
      
      where = {
        course: { subject: { in: subjects } }
      }
    } else if (courseId) {
      where.courseId = courseId
    }

    const exams = await (prisma as any).exam.findMany({
      where,
      include: {
        course: { select: { name: true, color: true } },
        _count: { select: { questions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(exams)
  } catch (error) {
    console.error('Error fetching exams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.formData()
    const payload = JSON.parse(data.get('payload') as string)
    
    const { title, description, courseId, expiresAt, startDate, durationMinutes, questions } = payload

    // Questions are now optional initially, but other general info is mandatory
    if (!title || !courseId || !expiresAt || !startDate || !durationMinutes) {
      return NextResponse.json({ error: 'Missing required exam details (title, course, dates, or duration)' }, { status: 400 })
    }

    const exam = await prisma.$transaction(async (tx) => {
      // Fetch course to get subject
      const course = await tx.course.findUnique({
        where: { id: courseId },
        select: { subject: true }
      })
      const subject = course?.subject || 'General'

      // 1. Create QuestionBank entries only if questions are provided
      const questionData = questions && Array.isArray(questions) ? await Promise.all(questions.map(async (q: any, index: number) => {
        // If question already has a questionBankId, don't create a new one
        if (q.questionBankId) {
          return {
            text: q.text,
            type: q.type,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            imageUrl: q.imageUrl,
            marks: q.marks || 1,
            order: index,
            questionBankId: q.questionBankId
          }
        }

        const qb = await tx.questionBank.create({
          data: {
            subject: subject,
            text: q.text,
            type: q.type,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            imageUrl: q.imageUrl,
            createdById: session.userId,
          }
        })

        return {
          text: q.text,
          type: q.type,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          imageUrl: q.imageUrl,
          marks: q.marks || 1,
          order: index,
          questionBankId: qb.id
        }
      })) : []

      return await tx.exam.create({
        data: {
          title,
          description,
          courseId,
          expiresAt: new Date(expiresAt),
          startDate: new Date(startDate),
          durationMinutes: parseInt(durationMinutes),
          createdById: session.userId,
          questions: {
            create: questionData
          }
        },
        include: {
          questions: true
        }
      })
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: 'EXAM_CREATED', // Using string literal as I might need to update activity-log.ts
      actionDescription: `${session.name} created exam "${title}"`,
      moduleName: 'Exams',
      targetId: exam.id
    })

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    console.error('Error creating exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

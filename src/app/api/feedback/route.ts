import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const studentId = searchParams.get('studentId')

    const where: any = {}
    
    if (session.role === 'STUDENT') {
      // Students can ONLY see their own feedback
      where.studentId = session.userId
    } else if (session.role === 'MANAGER') {
      // Managers can see everything, optionally filtered
      if (courseId) where.courseId = courseId
      if (studentId) where.studentId = studentId
    } else {
      // Teachers and Admins are NOT allowed to see feedback
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      include: {
        student: { select: { name: true, email: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(feedbacks)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate Limiting
    const ip = request.ip ?? '127.0.0.1'
    const { success } = await checkRateLimit(`${session.userId}_${ip}`, 'feedback')
    if (!success) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }

    const {
      courseId,
      teacherRating,
      conceptRating,
      materialRating,
      recommendScore,
      comment,
    } = await request.json()

    if (!courseId || !teacherRating || !conceptRating || !materialRating || !recommendScore) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (comment && comment.length > 500) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 })
    }

    // Check if feedback already exists for this course by this student
    const existingFeedback = await prisma.feedback.findUnique({
      where: {
        studentId_courseId: {
          studentId: session.userId,
          courseId,
        },
      },
    })

    if (existingFeedback) {
      return NextResponse.json({ error: 'Feedback already submitted for this course' }, { status: 400 })
    }

    const feedback = await prisma.feedback.create({
      data: {
        studentId: session.userId,
        courseId,
        teacherRating,
        conceptRating,
        materialRating,
        recommendScore,
        comment,
      },
    })

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

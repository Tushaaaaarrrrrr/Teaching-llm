import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkRateLimit } from '@/lib/ratelimit'
import { sanitizeInput } from '@/lib/validation'
import { DEFAULT_FINAL_TEST_WINDOW_MS, isFinalTest } from '@/lib/exam-policy'
import { randomUUID } from 'crypto'
import { sendFcmToUsers } from '@/lib/fcm'
import { sendPushToUsers } from '@/lib/push'
import { checkAndAutoSubmitAttempts } from '@/lib/exam-db-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role === 'STUDENT') {
      await checkAndAutoSubmitAttempts({ userId: session.userId })
    }


    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const testSeriesId = searchParams.get('testSeriesId')

    let where: any = {}

    if (session.role === 'STUDENT') {
      // Students only see published exams in their courses
      const user = (await prisma.user.findUnique({
        where: { id: session.userId },
        select: { 
          enrollments: {
            select: {
              course: {
                select: { id: true }
              }
            }
          }
        } as any,
      })) as any
      const enrolledCourseIds = user?.enrollments.map((e: any) => e.course.id) || []

      // Also get test series the student has access to
      const testSeriesAccesses = await (prisma as any).testSeriesAccess.findMany({
        where: {
          userId: session.userId,
          expiresAt: { gt: new Date() } // Only non-expired access
        },
        select: { testSeriesId: true }
      })
      const accessedTestSeriesIds = testSeriesAccesses.map((a: any) => a.testSeriesId)

      if (testSeriesId) {
        // Fetching exams for a specific test series
        if (accessedTestSeriesIds.includes(testSeriesId)) {
          where = { testSeriesId, isPublished: true }
        } else {
          where = { testSeriesId: 'none' }
        }
      } else if (courseId) {
        if (enrolledCourseIds.includes(courseId)) {
          where = { courseId, isPublished: true }
        } else {
          where = { courseId: 'none' }
        }
      } else {
        // Show all accessible exams (course + test series)
        where = {
          isPublished: true,
          OR: [
            { courseId: { in: enrolledCourseIds } },
            ...(accessedTestSeriesIds.length > 0 ? [{ testSeriesId: { in: accessedTestSeriesIds } }] : [])
          ]
        }
      }
    } else if (session.role === 'ADMIN') {
      // Admins only see exams for their assigned subjects
      const admin = (await prisma.user.findUnique({
        where: { id: session.userId },
        include: { enrollments: { include: { course: { select: { subject: true } } } } } as any
      })) as any
      const subjects = admin?.enrollments.map((e: any) => e.course.subject).filter(Boolean) as string[]
      
      where = {
        OR: [
          { course: { subject: { in: subjects } } },
          { testSeriesId: { not: null } }
        ]
      }

      if (courseId) {
        where = { courseId }
      }
      if (testSeriesId) {
        where = { testSeriesId }
      }
    } else {
      // Manager sees everything
      if (courseId) {
        where.courseId = courseId
      }
      if (testSeriesId) {
        where.testSeriesId = testSeriesId
      }
    }

    const exams = await (prisma as any).exam.findMany({
      where,
      include: {
        course: { select: { name: true, color: true } },
        testSeries: { select: { id: true, title: true } },
        _count: { select: { questions: true } },
        ...(session.role === 'STUDENT' ? {
          attempts: {
            where: { userId: session.userId },
            select: { id: true, submittedAt: true, startedAt: true }
          }
        } : {})
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
    const payloadBuffer = data.get('payload')
    if (!payloadBuffer) {
      return NextResponse.json({ error: 'Payload is required' }, { status: 400 })
    }
    const payload = JSON.parse(payloadBuffer as string)
    
    const { title, description, courseId, testSeriesId, expiresAt, startDate, durationMinutes, examType, questions } = payload
    
    // Make sure we have either a course or a test series
    if (!courseId && !testSeriesId) {
      return NextResponse.json({ error: 'Exam must belong to either a course or a test series' }, { status: 400 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (courseId && accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
      return NextResponse.json({ error: 'You do not have access to create exams for this course' }, { status: 403 })
    }

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(session.userId, 'general')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'You are doing this too fast, please wait.' }, 
        { status: 429 }
      )
    }

    // 2. Validation
    if (!title || (!courseId && !testSeriesId) || !durationMinutes) {
      return NextResponse.json({ error: 'Missing required exam details (title, target, or duration)' }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title is too long (max 200 chars)' }, { status: 400 })
    }

    if (description && description.length > 2000) {
      return NextResponse.json({ error: 'Description is too long (max 2000 chars)' }, { status: 400 })
    }

    const sanitizedTitle = sanitizeInput(title)
    const sanitizedDescription = description ? sanitizeInput(description) : null

    const finalTest = isFinalTest(examType)
    const now = new Date()
    const computedStartDate = startDate ? new Date(startDate) : (finalTest ? now : null)
    const computedExpiresAt = expiresAt
      ? new Date(expiresAt)
      : (finalTest ? new Date(now.getTime() + DEFAULT_FINAL_TEST_WINDOW_MS) : null)

    if (!computedExpiresAt) {
      return NextResponse.json({ error: 'End date is required for this exam type' }, { status: 400 })
    }

    if (computedStartDate && computedExpiresAt <= computedStartDate) {
      return NextResponse.json({ error: 'End date must be later than the start date' }, { status: 400 })
    }

    const exam = await prisma.$transaction(async (tx) => {
      let subject = 'General'
      if (courseId) {
        // Fetch course to get subject
        const course = await tx.course.findUnique({
          where: { id: courseId },
          select: { subject: true }
        })
        subject = course?.subject || 'General'
      } else if (testSeriesId) {
        // Use test series title or generic subject
        const ts = await (tx as any).testSeries.findUnique({
          where: { id: testSeriesId },
          select: { title: true }
        })
        subject = ts?.title || 'Test Series'
      }

      // 1. Create QuestionBank entries only if questions are provided
      const questionData = questions && Array.isArray(questions) ? await Promise.all(questions.map(async (q: any, index: number) => {
        // If question already has a questionBankId, don't create a new one
        if (q.questionBankId) {
          return {
            text: q.text,
            type: q.type,
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
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
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            imageUrl: q.imageUrl,
            createdById: session.userId,
          }
        })

        return {
          text: q.text,
          type: q.type,
          options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          imageUrl: q.imageUrl,
          marks: q.marks || 1,
          order: index,
          questionBankId: qb.id
        }
      })) : []

      const exam = await (tx.exam as any).create({
        data: {
          externalId: randomUUID(),
          title: sanitizedTitle,
          description: sanitizedDescription,
          courseId: courseId || null,
          testSeriesId: testSeriesId || null,
          expiresAt: computedExpiresAt,
          startDate: computedStartDate,
          durationMinutes: parseInt(durationMinutes),
          examType: examType || 'FINAL_TEST',
          isPublished: true, // Visible immediately
          createdById: session.userId,
          questions: {
            create: questionData
          }
        },
        include: {
          questions: true
        }
      })

      // Notify enrolled students about the new exam if it's for a course
      if (courseId) {
        const enrollments = await tx.enrollment.findMany({
          where: { courseId },
          select: { userId: true }
        })

        const managers = await tx.user.findMany({
          where: {
            OR: [
              { role: 'MANAGER' },
              { isSuperManager: true },
            ],
          },
          select: { id: true },
        })
        const managerIds = managers.map(m => m.id)

        const recipientIds = Array.from(new Set([
          ...enrollments.map(e => e.userId),
          ...managerIds
        ]))

        if (recipientIds.length > 0) {
          await tx.notification.createMany({
            data: recipientIds.map(userId => ({
              userId,
              title: 'New Exam Created',
              content: `A new exam "${sanitizedTitle}" has been added to your course. Check it in the Exams tab.`,
              type: 'INFO',
            }))
          })

          // Send FCM and Web push to recipients
          const pushPayload = {
            title: '📝 New Exam Created',
            body: `A new exam "${sanitizedTitle}" has been added. Check it in the Exams tab.`,
            url: '/exams',
            tag: `exam-${exam.id}`,
          }
          Promise.allSettled([
            sendFcmToUsers(recipientIds, pushPayload),
            sendPushToUsers(recipientIds, pushPayload),
          ]).catch(console.error)
        }
      } else if (testSeriesId) {
        // Notify test series subscribers
        const accesses = await (tx as any).testSeriesAccess.findMany({
          where: { testSeriesId, expiresAt: { gt: new Date() } },
          select: { userId: true }
        })

        const managers = await tx.user.findMany({
          where: {
            OR: [
              { role: 'MANAGER' },
              { isSuperManager: true },
            ],
          },
          select: { id: true },
        })
        const managerIds = managers.map(m => m.id)

        const recipientIds = Array.from(new Set([
          ...accesses.map((a: any) => a.userId),
          ...managerIds
        ]))

        if (recipientIds.length > 0) {
          await tx.notification.createMany({
            data: recipientIds.map((userId: string) => ({
              userId,
              title: 'New Exam in Test Series',
              content: `A new exam "${sanitizedTitle}" has been added to your Test Series. Check it now!`,
              type: 'INFO',
            }))
          })

          // Send FCM and Web push to recipients
          const pushPayload = {
            title: '📝 New Exam in Test Series',
            body: `A new exam "${sanitizedTitle}" has been added to your Test Series!`,
            url: '/exams',
            tag: `exam-${exam.id}`,
          }
          Promise.allSettled([
            sendFcmToUsers(recipientIds, pushPayload),
            sendPushToUsers(recipientIds, pushPayload),
          ]).catch(console.error)
        }
      }

      return exam
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EXAM_CREATED,
      actionDescription: `${session.name} created exam "${sanitizedTitle}"`,
      moduleName: MODULE.EXAMS,
      targetId: exam.id
    })

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    console.error('Error creating exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

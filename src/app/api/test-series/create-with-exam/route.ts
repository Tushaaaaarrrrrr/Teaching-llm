import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkRateLimit } from '@/lib/ratelimit'
import { sanitizeInput } from '@/lib/validation'
import { DEFAULT_FINAL_TEST_WINDOW_MS, isFinalTest } from '@/lib/exam-policy'
import { randomUUID } from 'crypto'

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
    
    const { 
      title, 
      description, 
      price, 
      validityDays, 
      expiresAt, 
      startDate, 
      durationMinutes, 
      examType, 
      questions 
    } = payload
    
    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(session.userId, 'general')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'You are doing this too fast, please wait.' }, 
        { status: 429 }
      )
    }

    // 2. Validation
    if (!title || !durationMinutes) {
      return NextResponse.json({ error: 'Missing required test series/exam details' }, { status: 400 })
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

    const testSeries = await prisma.$transaction(async (tx) => {
      // 1. Create the Test Series
      const ts = await (tx as any).testSeries.create({
        data: {
          title: sanitizedTitle,
          description: sanitizedDescription,
          price: parseFloat(price) || 0,
          validityDays: parseInt(validityDays) || 365,
          createdById: session.userId,
          isActive: true
        }
      })

      // 2. Create QuestionBank entries only if questions are provided
      const questionData = questions && Array.isArray(questions) ? await Promise.all(questions.map(async (q: any, index: number) => {
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
            subject: sanitizedTitle, // using test series title as subject for new questions
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

      // 3. Create the Exam associated with the Test Series
      await (tx.exam as any).create({
        data: {
          externalId: randomUUID(),
          title: `${sanitizedTitle} - Test 1`, // Default name for the first exam
          description: sanitizedDescription,
          testSeriesId: ts.id,
          expiresAt: computedExpiresAt,
          startDate: computedStartDate,
          durationMinutes: parseInt(durationMinutes),
          examType: examType || 'PRACTICE_TEST',
          isPublished: true, 
          createdById: session.userId,
          questions: {
            create: questionData
          }
        }
      })

      return ts
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: 'TEST_SERIES_CREATED',
      actionDescription: `${session.name} created test series "${sanitizedTitle}" with exam`,
      moduleName: 'STORE',
      targetId: testSeries.id
    })

    return NextResponse.json(testSeries, { status: 201 })
  } catch (error) {
    console.error('Error creating test series with exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

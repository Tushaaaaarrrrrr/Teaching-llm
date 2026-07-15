import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'

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

    const { rating, comment, platform } = await request.json()

    if (!rating || rating < 1 || rating > 5 || !platform) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    if (comment && comment.length > 500) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 })
    }

    // Check if already submitted
    const existing = await (prisma as any).appFeedback.findFirst({
      where: { studentId: session.userId, platform }
    })

    if (existing) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 400 })
    }

    const feedback = await (prisma as any).appFeedback.create({
      data: {
        studentId: session.userId,
        rating,
        comment,
        platform,
      }
    })

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, rating, comment } = await request.json()

    if (!id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    if (comment && comment.length > 500) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 })
    }

    const existing = await (prisma as any).appFeedback.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    if (existing.studentId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await (prisma as any).appFeedback.update({
      where: { id },
      data: {
        rating,
        comment
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

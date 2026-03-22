import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { validateComment } from '@/lib/validation'
import { checkRateLimit } from '@/lib/ratelimit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: contentId } = await params

    const comments = await prisma.comment.findMany({
      where: { contentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Organize comments into a tree structure
    const commentMap = new Map()
    const rootComments: any[] = []

    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies.push(commentWithReplies)
        } else {
          rootComments.push(commentWithReplies)
        }
      } else {
        rootComments.push(commentWithReplies)
      }
    })

    return NextResponse.json(rootComments)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: contentId } = await params
    const { content, parentId } = await request.json()

    // 1. Rate Limiting
    const limit = await checkRateLimit(session.userId, 'comment')
    if (!limit.success) {
      return NextResponse.json(
        { error: 'You are doing this too fast, please wait.' }, 
        { status: 429 }
      )
    }

    // 2. Validation & Sanitization
    const { error, sanitized } = validateComment(content)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    // 3. Repeated Comment Protection (check last 5 minutes for identical content by same user)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const existing = await prisma.comment.findFirst({
      where: {
        userId: session.userId,
        content: sanitized,
        createdAt: { gte: fiveMinutesAgo }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already posted this comment recently.' }, 
        { status: 400 }
      )
    }

    const comment = await prisma.comment.create({
      data: {
        content: sanitized as string,
        contentId,
        userId: session.userId,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await prisma.systemUpdate.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { views: true } },
        createdBy: { select: { name: true } },
      },
    })

    return NextResponse.json({ updates })
  } catch (error) {
    console.error('Error fetching updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title, content, type, imageUrl, isActive, priority,
      animationType, showDelay, targetRole, scheduledAt, expiresAt,
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const validTypes = ['WELCOME', 'GENERAL', 'DAILY_DIGEST']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid update type' }, { status: 400 })
    }

    const update = await prisma.systemUpdate.create({
      data: {
        title,
        content,
        type: type || 'GENERAL',
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
        priority: priority || 0,
        animationType: animationType || null,
        showDelay: showDelay || 0,
        targetRole: targetRole || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: session.userId,
      },
    })

    return NextResponse.json({ update }, { status: 201 })
  } catch (error) {
    console.error('Error creating update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

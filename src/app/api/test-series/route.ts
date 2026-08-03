import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

// GET: List all test series (public for students, full for managers)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testSeries = await (prisma as any).testSeries.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { exams: true, accesses: true } },
        exams: {
          select: {
            id: true,
            title: true,
            description: true,
            examType: true,
            durationMinutes: true,
            isPublished: true,
            startDate: true,
            expiresAt: true,
            _count: { select: { questions: true } }
          },
          orderBy: { createdAt: 'asc' as const }
        },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' as const }
    })

    // If student, also attach their access info
    if (session.role === 'STUDENT') {
      const accesses = await (prisma as any).testSeriesAccess.findMany({
        where: { userId: session.userId }
      })
      const accessMap = new Map(accesses.map((a: any) => [a.testSeriesId, a]))

      const enriched = testSeries.map((ts: any) => ({
        ...ts,
        myAccess: accessMap.get(ts.id) || null
      }))

      return NextResponse.json({ testSeries: enriched })
    }

    return NextResponse.json({ testSeries })
  } catch (error: any) {
    console.error('Error fetching test series:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new test series (manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, price, originalPrice, validityDays, category } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const testSeries = await (prisma as any).testSeries.create({
      data: {
        title,
        description: description || null,
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        validityDays: parseInt(validityDays) || 365,
        createdById: session.userId,
        category: category || "General",
      },
      include: {
        _count: { select: { exams: true } },
        createdBy: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({ testSeries }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating test series:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

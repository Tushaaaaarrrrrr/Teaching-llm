import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/support/feature-requests — list all (manager/admin) or own (student/instructor)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isManager = session.role === 'MANAGER' || session.role === 'ADMIN'

    const requests = await prisma.featureRequest.findMany({
      where: isManager ? {} : { userId: session.userId },
      include: {
        user: { select: { id: true, name: true, role: true, email: true, securityNumber: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching feature requests:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/support/feature-requests — submit a new feature request
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, description, imageUrls } = body

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    const featureRequest = await prisma.featureRequest.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        description: description.trim(),
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      },
      include: {
        user: { select: { id: true, name: true, role: true, email: true, securityNumber: true, avatar: true } },
      },
    })

    return NextResponse.json(featureRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating feature request:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/support/feature-requests — update status (manager/admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    const updated = await prisma.featureRequest.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, role: true, email: true, securityNumber: true, avatar: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating feature request:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

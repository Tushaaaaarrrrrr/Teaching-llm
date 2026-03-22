import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkRateLimit } from '@/lib/ratelimit'
import { sanitizeInput } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const where = courseId ? { courseId } : {}

    const materials = await prisma.material.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, color: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageContent(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { courseId, title, description, fileUrl, fileType, fileSize } =
      await request.json()

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(session.userId, 'general')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'You are doing this too fast, please wait.' }, 
        { status: 429 }
      )
    }

    // 2. Validation
    if (!title || !fileUrl) {
      return NextResponse.json({ error: 'Title and file URL are required' }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title is too long (max 200 chars)' }, { status: 400 })
    }

    if (description && description.length > 1000) {
      return NextResponse.json({ error: 'Description is too long (max 1000 chars)' }, { status: 400 })
    }

    const sanitizedTitle = sanitizeInput(title)
    const sanitizedDescription = description ? sanitizeInput(description) : null


    let finalFileType = fileType
    if (!finalFileType && fileUrl) {
      finalFileType = fileUrl.split('.').pop()?.split('?')[0]?.toUpperCase() || 'FILE'
    }

    const material = await prisma.material.create({
      data: {
        courseId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        fileUrl,
        fileType: finalFileType || 'FILE',
        fileSize,
        uploadedById: session.userId,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MATERIAL_CREATED,
      actionDescription: `${session.name} created material "${sanitizedTitle}"`,
      moduleName: MODULE.MATERIALS,
      targetId: material.id,
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

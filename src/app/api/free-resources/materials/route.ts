import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const materials = await (prisma.material.findMany as any)({
      where: {
        isFree: true,
        courseId: null,
      },
      include: {
        uploadedBy: { select: { name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching free materials:', error)
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

    const { title, description, fileUrl, fileType, fileSize } = await request.json()

    if (!title || !fileUrl) {
      return NextResponse.json({ error: 'Title and file URL are required' }, { status: 400 })
    }

    const material = await (prisma.material.create as any)({
      data: {
        courseId: null,
        title,
        description,
        fileUrl,
        fileType: fileType || 'unknown',
        fileSize,
        isFree: true,
        isGlobal: false,
        uploadedById: session.userId,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MATERIAL_CREATED,
      actionDescription: `${session.name} created free material "${title}"`,
      moduleName: MODULE.MATERIALS,
      targetId: material.id,
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Error creating free material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

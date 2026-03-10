import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent, isInstructor, getInstructorClassIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    const where = classId ? { classId } : {}

    const materials = await prisma.material.findMany({
      where,
      include: {
        class: { select: { name: true } },
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

    const { classId, title, description, fileUrl, fileType, fileSize } =
      await request.json()

    // Instructor: can only create materials in assigned classes
    if (isInstructor(session.role)) {
      const assignedIds = await getInstructorClassIds(session.userId)
      if (!assignedIds.includes(classId)) {
        return NextResponse.json({ error: 'You are not assigned to this subject' }, { status: 403 })
      }
    }

    const material = await prisma.material.create({
      data: {
        classId,
        title,
        description,
        fileUrl,
        fileType,
        fileSize,
        uploadedById: session.userId,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MATERIAL_CREATED,
      actionDescription: `${session.name} created material "${title}"`,
      moduleName: MODULE.MATERIALS,
      targetId: material.id,
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

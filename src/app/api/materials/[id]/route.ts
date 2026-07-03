import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageContent(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const {
      courseId,
      title,
      description,
      fileUrl,
      fileType,
      fileSize,
      isGlobal,
      category,
      level,
      subject,
      term,
      sourceType,
    } = await request.json()

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: {
        courseId,
        title,
        description,
        fileUrl,
        fileType,
        fileSize,
        isGlobal: isGlobal === undefined ? undefined : !!isGlobal,
        category,
        level,
        subject,
        term,
        sourceType,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MATERIAL_UPDATED,
      actionDescription: `${session.name} updated material "${updatedMaterial.title}"`,
      moduleName: MODULE.MATERIALS,
      targetId: id,
    })

    return NextResponse.json(updatedMaterial)
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageContent(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params


    const existing = await prisma.material.findUnique({ where: { id }, select: { title: true } })

    await prisma.material.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MATERIAL_DELETED,
      actionDescription: `${session.name} deleted material "${existing?.title}"`,
      moduleName: MODULE.MATERIALS,
      targetId: id,
    })

    return NextResponse.json({ message: 'Material deleted successfully' })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

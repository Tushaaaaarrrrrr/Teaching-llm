import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canManageContent, isInstructor, getInstructorClassIds } from '@/lib/auth'
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
    const { classId, title, description, fileUrl, fileType, fileSize } =
      await request.json()

    // Instructor: can only edit materials in assigned classes
    if (isInstructor(session.role)) {
      const material = await prisma.material.findUnique({ where: { id }, select: { classId: true } })
      if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 })
      const assignedIds = await getInstructorClassIds(session.userId)
      if (!assignedIds.includes(material.classId)) {
        return NextResponse.json({ error: 'You are not assigned to this subject' }, { status: 403 })
      }
    }

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: { classId, title, description, fileUrl, fileType, fileSize },
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

    // Instructor: can only delete materials in assigned classes
    if (isInstructor(session.role)) {
      const material = await prisma.material.findUnique({ where: { id }, select: { classId: true } })
      if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 })
      const assignedIds = await getInstructorClassIds(session.userId)
      if (!assignedIds.includes(material.classId)) {
        return NextResponse.json({ error: 'You are not assigned to this subject' }, { status: 403 })
      }
    }

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

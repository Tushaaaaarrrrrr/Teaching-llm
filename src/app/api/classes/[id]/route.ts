import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        lectures: {
          include: { uploadedBy: { select: { name: true } } },
          orderBy: { uploadedAt: 'desc' },
        },
        liveSessions: {
          orderBy: { date: 'desc' },
        },
        materials: {
          orderBy: { uploadedAt: 'desc' },
        },
        events: {
          orderBy: { date: 'desc' },
        },
        instructorAssignments: {
          include: {
            instructor: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    return NextResponse.json(classData)
  } catch (error) {
    console.error('Error fetching class:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { name, description, subject, color, icon } = await request.json()

    const updatedClass = await prisma.class.update({
      where: { id },
      data: { name, description, subject, color, icon },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CLASS_UPDATED,
      actionDescription: `${session.name} updated class "${updatedClass.name}"`,
      moduleName: MODULE.CLASSES,
      targetId: id,
    })

    return NextResponse.json(updatedClass)
  } catch (error) {
    console.error('Error updating class:', error)
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

    if (!isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const classToDelete = await prisma.class.findUnique({
      where: { id },
      select: { name: true },
    })

    await prisma.class.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CLASS_DELETED,
      actionDescription: `${session.name} deleted class "${classToDelete?.name ?? id}"`,
      moduleName: MODULE.CLASSES,
      targetId: id,
    })

    return NextResponse.json({ message: 'Class deleted successfully' })
  } catch (error) {
    console.error('Error deleting class:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

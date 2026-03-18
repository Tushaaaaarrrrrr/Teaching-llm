import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { validateLength, sanitizeInput } from '@/lib/validation'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Only managers can edit announcements' }, { status: 403 })
    }

    const id = params.id
    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { title, content, type, courseId, imageUrl } = await request.json()

    if (title && !validateLength(title, 200)) {
      return NextResponse.json({ error: 'Title must be under 200 chars' }, { status: 400 })
    }
    if (content && !validateLength(content, 10000)) {
      return NextResponse.json({ error: 'Content must be under 10000 chars' }, { status: 400 })
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title: sanitizeInput(title) }),
        ...(content && { content: sanitizeInput(content) }),
        ...(type && { type }),
        courseId: courseId || null,
        ...(imageUrl !== undefined && { imageUrl }),
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatar: true } },
        course: { select: { id: true, name: true, color: true } },
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.ANNOUNCEMENT_UPDATED || 'ANNOUNCEMENT_UPDATED',
      actionDescription: `${session.name} updated announcement "${updated.title}"`,
      moduleName: MODULE.ANNOUNCEMENTS,
      targetId: id,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Only managers can delete announcements' }, { status: 403 })
    }

    const id = params.id
    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Delete related notifications and poll if any, then the announcement itself
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { announcementId: id } })
      
      const deleted = await tx.announcement.delete({ where: { id } })
      
      if (deleted.pollId) {
        await tx.poll.delete({ where: { id: deleted.pollId } })
      }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.ANNOUNCEMENT_DELETED || 'ANNOUNCEMENT_DELETED',
      actionDescription: `${session.name} deleted announcement "${existing.title}"`,
      moduleName: MODULE.ANNOUNCEMENTS,
      targetId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const { title, description, videoUrl, videoSource, pptUrl } = await request.json()

    if (!title?.trim() || !videoUrl?.trim()) {
      return NextResponse.json({ error: 'Title and Video URL are mandatory' }, { status: 400 })
    }

    const content = await prisma.content.update({
      where: { id },
      data: {
        title: title.trim(),
        description,
        videoUrl: videoUrl.trim(),
        videoSource: videoSource || 'YOUTUBE',
        pptUrl,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CONTENT_UPDATED,
      actionDescription: `${session.name} updated content "${content.title}"`,
      moduleName: MODULE.CONTENT,
      targetId: id,
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageContent(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const existing = await prisma.content.findUnique({ where: { id }, select: { title: true } })
    await prisma.content.delete({ where: { id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.CONTENT_DELETED,
      actionDescription: `${session.name} deleted content "${existing?.title}"`,
      moduleName: MODULE.CONTENT,
      targetId: id,
    })

    return NextResponse.json({ message: 'Content deleted' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

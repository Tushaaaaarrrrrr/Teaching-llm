import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Direct Messages do not support pinned messages
    if (courseId.startsWith('dm_')) {
      return NextResponse.json({ pinnedMessage: null })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pinnedMsg = await prisma.communityMessage.findFirst({
      where: {
        courseId,
        isPinned: true,
        isDeleted: false,
        isSystemDeleted: false,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, securityNumber: true, avatar: true, gender: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true, role: true, avatar: true, gender: true } }
          }
        }
      },
    })

    if (!pinnedMsg) {
      return NextResponse.json({ pinnedMessage: null })
    }

    const sanitizedPinned = {
      ...pinnedMsg,
      sender: {
        ...pinnedMsg.sender,
        securityNumber: session.role === 'MANAGER' ? pinnedMsg.sender.securityNumber : undefined,
      },
    }

    return NextResponse.json({ pinnedMessage: sanitizedPinned })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

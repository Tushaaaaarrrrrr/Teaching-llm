import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const session = await getSession()
    
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Bulk update all messages to isDeleted: true
    const result = await prisma.communityMessage.updateMany({
      where: { 
        courseId,
        isDeleted: false,
        isSystemDeleted: false
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.MESSAGE_DELETED, // Reusing existing action type or could add a specific BULK_CLEAR
      actionDescription: `${session.name} cleared all messages in ${course.name} community`,
      moduleName: MODULE.COMMUNITY,
      targetId: courseId,
      metadata: { count: result.count }
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('[COMMUNITY_CLEAR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

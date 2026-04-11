import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    // strictly MANAGER
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { items, courseId } = body

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Prepare transaction
    const updates = items.map((item: { id: string; order: number }) =>
      prisma.topic.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    )

    await prisma.$transaction(updates)

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: 'TOPIC_REORDERED' as any,
      actionDescription: `${session.name} reordered topics in course ${courseId || 'unknown'}`,
      moduleName: MODULE.TOPICS,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reordering topics:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

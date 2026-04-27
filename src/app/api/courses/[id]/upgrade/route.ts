import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: courseId } = await params

    // Find the enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
    }

    if (enrollment.type === 'LIVE') {
      return NextResponse.json({ error: 'You are already in the Live batch' }, { status: 400 })
    }

    // Verify course has an upgrade price set
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true, liveUpgradePrice: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.liveUpgradePrice) {
      return NextResponse.json({ error: 'Upgrade is not available for this course' }, { status: 400 })
    }

    // TODO: Integrate actual payment gateway here in the future.
    // For now, the upgrade is processed directly (simulated payment).

    // Update the enrollment type to LIVE
    await prisma.enrollment.update({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
      data: { type: 'LIVE' },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EXTERNAL_ENROLLMENT,
      actionDescription: `${session.name} upgraded to Live batch for "${course.name}" (₹${course.liveUpgradePrice})`,
      moduleName: MODULE.ENROLLMENT,
      targetId: courseId,
    })

    return NextResponse.json({ message: 'Successfully upgraded to Live batch!' })
  } catch (error) {
    console.error('Error upgrading enrollment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

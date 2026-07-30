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

    const { id } = await params

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: id,
        },
      },
      include: {
        course: { select: { name: true } },
      },
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'You are not enrolled in this course demo' }, { status: 404 })
    }

    if (enrollment.type !== 'DEMO') {
      return NextResponse.json(
        { error: 'Only demo enrollments can be unenrolled directly by the student.' },
        { status: 400 }
      )
    }

    await prisma.enrollment.delete({
      where: {
        id: enrollment.id,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.UNENROLLED || 'UNENROLLED',
      actionDescription: `${session.name} unenrolled from demo for ${enrollment.course.name}`,
      moduleName: MODULE.ENROLLMENT,
      targetId: enrollment.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully unenrolled from demo.',
    })
  } catch (error: any) {
    console.error('Error in demo unenroll:', error)
    return NextResponse.json({ error: error.message || 'Failed to unenroll' }, { status: 500 })
  }
}

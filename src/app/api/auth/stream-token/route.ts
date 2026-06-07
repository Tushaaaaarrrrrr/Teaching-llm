import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, signStreamToken, isAdminOrManager } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lectureId = searchParams.get('lectureId')

    if (!lectureId) {
      return NextResponse.json({ error: 'lectureId is required' }, { status: 400 })
    }

    // Verify the user has access to the course of this lecture
    const content = await prisma.content.findUnique({
      where: { id: lectureId },
      select: {
        id: true,
        topic: {
          select: {
            courseId: true,
          },
        },
      },
    })

    if (!content) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    // Access control check
    const privileged = isAdminOrManager(session.role) || session.role === 'INSTRUCTOR'
    if (!privileged) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.userId,
            courseId: content.topic.courseId,
          },
        },
      })
      if (!enrollment) {
        return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
      }
    }

    // Generate short-lived token (4 hours)
    const token = signStreamToken(session.userId, lectureId, session.role)

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error generating stream token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

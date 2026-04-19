import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { courseId } = params;

    // DM chats are tracked via ChatSession.updatedAt — no communityReadState needed
    if (courseId.startsWith('dm_')) {
      return NextResponse.json({ success: true })
    }

    await prisma.communityReadState.upsert({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: courseId,
        }
      },
      create: {
        userId: session.userId,
        courseId: courseId,
        lastReadAt: new Date(),
      },
      update: {
        lastReadAt: new Date(),
      }
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating read state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

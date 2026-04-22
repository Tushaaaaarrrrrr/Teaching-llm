import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'
import { isCourseEffectivelyDisabled, isCourseExpired } from '@/lib/course-state'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    const where: any = {
      isGlobal: false,
    }

    if (session.role !== 'MANAGER') {
      where.isDisabled = false
      where.isCommunityActive = true
    }

    if (accessibleCourseIds !== null) {
      where.id = { in: accessibleCourseIds }
    }

    // Fetch courses but return them as "classes" for frontend compatibility
    const courses = await (prisma.course.findMany as any)({
      where,
      select: {
        id: true,
        name: true,
        subject: true,
        color: true,
        icon: true,
        isDisabled: true,
        isCommunityActive: true,
        lastMessageAt: true,
        _count: {
          select: {
            lectures: true
          }
        }
      },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' }
      ],
    })

    const readStates = await prisma.communityReadState.findMany({
      where: { userId: session.userId },
      select: { courseId: true, lastReadAt: true },
    })
    const readMap = new Map(readStates.map(r => [r.courseId, r.lastReadAt.getTime()]))

    const formattedCourses = courses.map((course: any) => {
        const lastMsgTime = course.lastMessageAt ? course.lastMessageAt.getTime() : 0;
        const lastReadTime = readMap.get(course.id) || 0;
        const hasUnread = lastMsgTime > lastReadTime;

        return {
          ...course,
          isExpired: isCourseExpired(course),
          isEffectivelyDisabled: isCourseEffectivelyDisabled(course),
          hasUnread,
        }
      })
    // Fetch ONLY Direct Chats (type=DIRECT) — NEVER show SUPPORT chats here
    let chatWhere: any = { type: 'DIRECT' }
    if (session.role === 'STUDENT' || session.role === 'ADMIN') {
      // Students only see ACTIVE DMs (not DISABLED or CLOSED)
      chatWhere.studentId = session.userId
      chatWhere.status = 'ACTIVE'
    } else {
      // Managers only see their own DMs, not other managers' chats
      chatWhere.agentId = session.userId
      chatWhere.status = { not: 'CLOSED' }
    }
    
    const chats = await prisma.chatSession.findMany({
      where: chatWhere,
      include: {
        student: { select: { name: true } },
        agent: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' }
    })

    const directChats = chats.map(chat => {
      const lastMsgTime = chat.updatedAt.getTime();
      const lastReadTime = readMap.get(`dm_${chat.id}`) || 0;
      return {
        id: `dm_${chat.id}`,
        name: session.role === 'STUDENT' ? `Chat with ${chat.agent?.name || 'Manager'}` : `Chat with ${chat.student.name}`,
        subject: 'Direct Message',
        color: '#3636e8',
        isDisabled: false,
        isCommunityActive: true,
        isDmDisabled: chat.status === 'DISABLED',
        lastMessageAt: chat.updatedAt,
        hasUnread: lastMsgTime > lastReadTime,
        isDirectChat: true,
        _count: { lectures: 0 }
      }
    })

    const combined = [...formattedCourses, ...directChats].sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return timeB - timeA
    })

    return NextResponse.json(combined)
  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

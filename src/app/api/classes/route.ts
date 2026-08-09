import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds, isManagerOrSuperAdmin } from '@/lib/auth'
import { isCourseEffectivelyDisabled, isCourseExpired } from '@/lib/course-state'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeDms = searchParams.get('includeDms') !== 'false'
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    const where: any = {
      isGlobal: false,
      id: { not: 'general-discussion' },
    }

    if (!isManagerOrSuperAdmin(session.role) || activeOnly) {
      where.isDisabled = false
      where.isCommunityActive = true
    }

    if (accessibleCourseIds !== null) {
      where.id = { in: accessibleCourseIds, not: 'general-discussion' }
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
        courseIconType: true,
        isDisabled: true,
        isCommunityActive: true,
        expiresAt: true,
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

    const [readStates, mutePrefs, userEnrollments] = await Promise.all([
      prisma.communityReadState.findMany({
        where: { userId: session.userId },
        select: { courseId: true, lastReadAt: true },
      }),
      prisma.communityMutePreference.findMany({
        where: { userId: session.userId },
        select: { courseId: true, isMuted: true },
      }),
      session.role === 'STUDENT'
        ? prisma.enrollment.findMany({
            where: { userId: session.userId },
            select: { courseId: true, type: true },
          })
        : Promise.resolve([]),
    ])
    const readMap = new Map(readStates.map(r => [r.courseId, r.lastReadAt.getTime()]))
    const muteMap = new Map(mutePrefs.map(m => [m.courseId, m.isMuted]))
    const enrollmentTypeMap = new Map(userEnrollments.map(e => [e.courseId, e.type]))

    const isManager = isManagerOrSuperAdmin(session.role)

    const formattedCourses = courses.map((course: any) => {
        const lastMsgTime = course.lastMessageAt ? course.lastMessageAt.getTime() : 0;
        const lastReadTime = readMap.get(course.id) || 0;
        const hasUnread = lastMsgTime > lastReadTime;
        const isMuted = muteMap.get(course.id) || false;
        const enrollmentType = enrollmentTypeMap.get(course.id) || null;

        return {
          ...course,
          enrollmentType,
          isDemoEnrollment: enrollmentType === 'DEMO',
          isExpired: isManager ? false : isCourseExpired(course),
          isEffectivelyDisabled: isManager ? false : isCourseEffectivelyDisabled(course),
          hasUnread,
          isMuted,
        }
      })
    let directChats: any[] = []
    if (includeDms) {
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
          student: { select: { name: true, role: true } },
          agent: { select: { name: true, role: true } },
        },
        orderBy: { updatedAt: 'desc' }
      })

      directChats = chats.map(chat => {
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
          _count: { lectures: 0 },
          role: session.role === 'STUDENT' ? (chat.agent?.role || 'MANAGER') : chat.student.role,
        }
      })
    }

    const filteredCourses = activeOnly 
      ? formattedCourses.filter((c: any) => !c.isDisabled && !isCourseExpired(c))
      : formattedCourses

    const combined = [...filteredCourses, ...directChats].sort((a, b) => {
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

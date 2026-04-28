import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds, isManagerOrSuperAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({})

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lastSeenCommunityAt: true, lastSeenSupportAt: true, lastSeenNotificationsAt: true, role: true }
    })
    if (!user) return NextResponse.json({})

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    const cw: any = { isGlobal: false, lastMessageAt: { not: null } }
    if (!isManagerOrSuperAdmin(session.role)) {
      cw.isDisabled = false
      cw.isCommunityActive = true
    }
    if (accessibleCourseIds !== null) cw.id = { in: accessibleCourseIds }

    // Find latest entries
    const [courses, readStates, lastTicket, lastChat, lastAnn] = await Promise.all([
      prisma.course.findMany({ where: cw, select: { id: true, lastMessageAt: true } }),
      prisma.communityReadState.findMany({ where: { userId: session.userId }, select: { courseId: true, lastReadAt: true } }),
      prisma.supportTicket.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
        where: user.role === 'STUDENT' ? { studentId: session.userId } : {}
      }).catch(() => null),
      prisma.chatSession.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
        where: {
          type: 'SUPPORT',
          ...(user.role === 'STUDENT' ? { studentId: session.userId } : {})
        }
      }).catch(() => null),
      prisma.announcement.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).catch(() => null),
    ])

    const readMap = new Map(readStates.map((r: any) => [r.courseId, r.lastReadAt.getTime()]))
    const hasCommunityUnread = courses.some((c: any) => {
      const lastMsg = c.lastMessageAt ? c.lastMessageAt.getTime() : 0;
      const lastRead = readMap.get(c.id) || 0;
      return lastMsg > lastRead;
    })

    const unread = {
      community: hasCommunityUnread,
      support: !!(
        (lastTicket && (!user.lastSeenSupportAt || lastTicket.updatedAt > user.lastSeenSupportAt)) ||
        (lastChat && (!user.lastSeenSupportAt || lastChat.updatedAt > user.lastSeenSupportAt))
      ),
      announcements: !!(lastAnn && (!user.lastSeenNotificationsAt || lastAnn.createdAt > user.lastSeenNotificationsAt)),
    }

    return NextResponse.json(unread)
  } catch (err) {
    console.error('Error fetching unread counts', err)
    return NextResponse.json({})
  }
}

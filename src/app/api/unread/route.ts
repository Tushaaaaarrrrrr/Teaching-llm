import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({})

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lastSeenCommunityAt: true, lastSeenSupportAt: true, lastSeenNotificationsAt: true, role: true }
    })
    if (!user) return NextResponse.json({})

    // Find latest entries
    const [lastPost, lastTicket, lastAnn] = await Promise.all([
      prisma.communityMessage.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).catch(() => null),
      prisma.supportTicket.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
        where: user.role === 'STUDENT' ? { studentId: session.userId } : {}
      }).catch(() => null),
      prisma.announcement.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).catch(() => null),
    ])

    const unread = {
      community: lastPost && (!user.lastSeenCommunityAt || lastPost.createdAt > user.lastSeenCommunityAt),
      support: lastTicket && (!user.lastSeenSupportAt || lastTicket.updatedAt > user.lastSeenSupportAt),
      announcements: lastAnn && (!user.lastSeenNotificationsAt || lastAnn.createdAt > user.lastSeenNotificationsAt),
    }

    return NextResponse.json(unread)
  } catch (err) {
    console.error('Error fetching unread counts', err)
    return NextResponse.json({})
  }
}

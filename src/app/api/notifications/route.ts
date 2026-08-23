import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: retentionCutoff },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const announcementIds = notifications
      .map(n => n.announcementId)
      .filter((id): id is string => !!id)
    const announcements = announcementIds.length > 0
      ? await prisma.announcement.findMany({
          where: { id: { in: announcementIds } },
          select: { id: true, content: true },
        })
      : []
    const announcementContent = new Map(announcements.map(a => [a.id, a.content]))
    const metaRegex = /<!-- fcm_meta:({.*?}) -->$/

    const mapped = notifications.map(notification => {
      const sourceContent = notification.announcementId
        ? announcementContent.get(notification.announcementId) || ''
        : notification.content
      const match = sourceContent.match(metaRegex)
      let ctaText = ''
      let ctaLink = ''
      if (match) {
        try {
          const metadata = JSON.parse(match[1])
          ctaText = metadata.ctaText || ''
          ctaLink = metadata.ctaLink || ''
        } catch {}
      }

      return {
        ...notification,
        content: notification.content.replace(metaRegex, '').trim(),
        ctaText: ctaText || undefined,
        ctaLink: ctaLink || undefined,
      }
    })

    return NextResponse.json(mapped)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

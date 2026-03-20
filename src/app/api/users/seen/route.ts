import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type } = await request.json()
    const now = new Date()

    const data: any = {}
    if (type === 'community') data.lastSeenCommunityAt = now
    if (type === 'support') data.lastSeenSupportAt = now
    if (type === 'announcements') data.lastSeenNotificationsAt = now

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id: session.userId },
        data
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error updating last seen', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

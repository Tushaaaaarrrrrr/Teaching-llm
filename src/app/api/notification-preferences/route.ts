import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/notification-preferences → { announcements: bool, community: bool }
// Used by the Flutter Notification Settings screen to hydrate the toggles.
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      notifAnnouncementsEnabled: true,
      notifCommunityEnabled: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({
    announcements: user.notifAnnouncementsEnabled,
    community: user.notifCommunityEnabled,
  })
}

// PATCH /api/notification-preferences { announcements?: bool, community?: bool }
// Partial update — only the keys present are written.
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const data: Record<string, boolean> = {}
  if (typeof body?.announcements === 'boolean') {
    data.notifAnnouncementsEnabled = body.announcements
  }
  if (typeof body?.community === 'boolean') {
    data.notifCommunityEnabled = body.community
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 },
    )
  }
  const updated = await prisma.user.update({
    where: { id: session.userId },
    data,
    select: {
      notifAnnouncementsEnabled: true,
      notifCommunityEnabled: true,
    },
  })
  return NextResponse.json({
    announcements: updated.notifAnnouncementsEnabled,
    community: updated.notifCommunityEnabled,
  })
}

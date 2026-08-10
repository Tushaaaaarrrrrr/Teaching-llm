import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { SOCIAL_BADGES, getSocialBadgeDefinition, isValidSocialBadgeId } from '@/lib/social-badges'

function requireStaff(role: string) {
  return isAdminOrManager(role)
}

export async function GET() {
  return NextResponse.json({ badges: SOCIAL_BADGES })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!requireStaff(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { badgeId, note } = await request.json()
    if (!isValidSocialBadgeId(badgeId)) {
      return NextResponse.json({ error: 'Invalid badge' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, isTerminated: true },
    })
    if (!target || target.isTerminated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const badge = await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: params.userId, badgeId } },
      update: {
        assignedById: session.userId,
        assignedAt: new Date(),
        note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null,
      },
      create: {
        userId: params.userId,
        badgeId,
        assignedById: session.userId,
        note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null,
      },
      select: { id: true, badgeId: true, assignedAt: true },
    })

    const definition = getSocialBadgeDefinition(badge.badgeId)
    return NextResponse.json({
      badge: {
        ...badge,
        label: definition?.label || badge.badgeId,
        category: definition?.category || 'COMMUNITY',
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error assigning badge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!requireStaff(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { badgeId } = await request.json()
    if (!isValidSocialBadgeId(badgeId)) {
      return NextResponse.json({ error: 'Invalid badge' }, { status: 400 })
    }

    await prisma.userBadge.deleteMany({
      where: { userId: params.userId, badgeId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error removing badge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

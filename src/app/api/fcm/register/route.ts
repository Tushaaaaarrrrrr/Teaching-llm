import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { syncUserTopicSubscriptions } from '@/lib/fcm'

// POST /api/fcm/register — save FCM device token from mobile app
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token, platform } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Missing FCM token' }, { status: 400 })
    }

    // Upsert: update if token already exists, else insert
    await prisma.fcmDeviceToken.upsert({
      where: { token },
      update: { userId: session.userId, platform: platform || 'ANDROID' },
      create: {
        userId: session.userId,
        token,
        platform: platform || 'ANDROID',
      },
    })

    // Sync topic subscriptions in background
    syncUserTopicSubscriptions(session.userId).catch((err) =>
      console.error('[FCM Register] Error syncing topic subscriptions:', err)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FCM register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/fcm/register — remove token (user logged out or uninstalled)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    await prisma.fcmDeviceToken.deleteMany({
      where: { token, userId: session.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FCM unregister error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

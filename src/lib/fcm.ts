import { prisma } from '@/lib/db'
import { firebaseAdmin } from '@/lib/firebase-admin'

interface FcmPayload {
  title: string
  body: string
  icon?: string
  url?: string   // deep-link path inside the app
  tag?: string   // collapse key for duplicate notifications
  imageUrl?: string
  ctaText?: string
  ctaLink?: string
  importance?: 'high' | 'default'
  sound?: 'default' | 'none' | string
  channelId?: string
}

/**
 * Sends an FCM push notification to a list of user IDs.
 * Silently removes expired/invalid tokens from DB.
 */
export async function sendFcmToUsers(userIds: string[], payload: FcmPayload) {
  if (!firebaseAdmin) {
    console.warn('Firebase Admin not initialised — skipping FCM notifications')
    return
  }

  const tokens = await prisma.fcmDeviceToken.findMany({
    where: { userId: { in: userIds } },
  })

  if (tokens.length === 0) return

  const isSilent = payload.importance === 'default'
  const isMuted  = payload.sound === 'none'
  const hasCustomSound = payload.sound && payload.sound !== 'default' && payload.sound !== 'none'
  const channelId = payload.channelId || (isSilent ? 'silent_updates' : 'class_updates')

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
    },
    data: {
      url: payload.url || payload.ctaLink || '/announcements',
      tag: payload.tag || 'general',
      ctaText: payload.ctaText || '',
      ctaLink: payload.ctaLink || '',
      imageUrl: payload.imageUrl || '',
    },
    android: {
      priority: (isSilent ? 'normal' : 'high') as 'normal' | 'high',
      notification: {
        icon: 'ic_launcher',
        color: '#4F46E5',
        channelId,
        defaultSound: !isMuted && !hasCustomSound,
        sound: hasCustomSound ? payload.sound : (isMuted ? '' : 'default'),
        defaultVibrateTimings: !isSilent,
        notificationPriority: (isSilent ? 'PRIORITY_DEFAULT' : 'PRIORITY_MAX') as 'PRIORITY_DEFAULT' | 'PRIORITY_MAX',
        ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: hasCustomSound ? `${payload.sound}.mp3` : (isMuted ? '' : 'default'),
        },
      },
    },
  }

  const staleIds: string[] = []

  await Promise.allSettled(
    tokens.map(async (t) => {
      try {
        await firebaseAdmin.messaging().send({
          ...message,
          token: t.token,
        })
      } catch (err: any) {
        // Token is invalid/expired — mark for cleanup
        if (
          err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered'
        ) {
          staleIds.push(t.id)
        } else {
          console.error('FCM send error:', err.message || err.code)
        }
      }
    })
  )

  // Clean up dead tokens
  if (staleIds.length > 0) {
    await prisma.fcmDeviceToken.deleteMany({ where: { id: { in: staleIds } } })
  }
}

/**
 * Sends an FCM notification to ALL students (global announcement).
 */
export async function sendFcmToAllStudents(payload: FcmPayload) {
  const allStudentIds = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  })
  await sendFcmToUsers(allStudentIds.map(u => u.id), payload)
}

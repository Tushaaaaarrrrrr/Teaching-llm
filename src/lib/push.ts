import webpush from 'web-push'
import { prisma } from '@/lib/db'

webpush.setVapidDetails(
  'mailto:admin@genz-iitian.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string   // where to navigate on click
  tag?: string   // collapses duplicate notifications
}

/**
 * Sends a web push notification to a list of user IDs.
 * Silently removes expired/invalid subscriptions from DB.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured — skipping push notifications')
    return
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  })

  if (subscriptions.length === 0) return

  const notification = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  payload.icon  || '/android-chrome-192x192.png',
    badge: payload.badge || '/favicon-32x32.png',
    url:   payload.url   || '/announcements',
    tag:   payload.tag   || 'announcement',
  })

  const staleIds: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification
        )
      } catch (err: any) {
        // 410 Gone = subscription expired / user revoked permission
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleIds.push(sub.id)
        } else {
          console.error('Push send error:', err.message)
        }
      }
    })
  )

  // Clean up dead subscriptions
  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } })
  }
}

/**
 * Sends a push to ALL subscribed students (global announcement).
 */
export async function sendPushToAllStudents(payload: PushPayload) {
  const allStudentIds = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  })
  await sendPushToUsers(allStudentIds.map(u => u.id), payload)
}

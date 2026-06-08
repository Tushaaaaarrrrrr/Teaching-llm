import { prisma } from '@/lib/db'
import { sendFcmToUsers } from '@/lib/fcm'
import { sendPushToUsers } from '@/lib/push'
import { sseEmitter } from '@/lib/sse'

// ─── Throttle: max 1 push per 3 seconds per group to prevent double-sends ────
const throttleMap = new Map<string, number>()
const THROTTLE_MS = 3_000

/**
 * Send FCM push notifications to enrolled users when ANY user
 * sends a community message (WhatsApp style). Fire-and-forget (non-blocking).
 *
 * – Excludes the sender
 * – Excludes users who muted this group (unless sender is MANAGER)
 * – Throttled: max 1 notification per 3 s per group (unless sender is MANAGER)
 */
export async function sendCommunityNotification(
  courseId: string,
  sender: { userId: string; name: string; role: string },
  message: { content: string; imageUrl?: string | null }
) {
  const isManager = sender.role === 'MANAGER'

  // ── Throttle check (only for non-managers) ──────────────────────────────────
  if (!isManager) {
    const now = Date.now()
    const lastSent = throttleMap.get(courseId) || 0
    if (now - lastSent < THROTTLE_MS) return
    throttleMap.set(courseId, now)
  }

  try {
    // Fetch course name + enrolled users + muted prefs in parallel
    const [course, enrollments, mutedPrefs] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
      prisma.communityMutePreference.findMany({
        where: { courseId, isMuted: true },
        select: { userId: true },
      }),
    ])

    const mutedSet = new Set(mutedPrefs.map((m) => m.userId))
    const recipientIds = enrollments
      .map((e) => e.userId)
      .filter((id) => id !== sender.userId && (isManager || !mutedSet.has(id)))

    if (recipientIds.length === 0) return

    const body = message.content
      ? `${sender.name}: ${message.content.slice(0, 120)}`
      : `${sender.name} sent a photo`

    const title = course?.name || 'Community'

    // ── If manager, create database notifications and emit SSE ───────────────
    if (isManager) {
      // 1. Create database notifications in bulk
      await prisma.notification.createMany({
        data: recipientIds.map((userId) => ({
          userId,
          title,
          content: body,
          type: 'INFO',
        })),
      })

      // 2. Notify connected clients via SSE
      recipientIds.forEach((userId) => {
        sseEmitter.emit(`user:${userId}:notify`)
      })
    }

    const pushPayload = {
      title,
      body,
      url: `/community?course=${courseId}`,
      tag: `community_${courseId}`,
      importance: 'high' as const,
      sound: 'default' as const,
      ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
    }

    await Promise.allSettled([
      sendPushToUsers(recipientIds, pushPayload),
      sendFcmToUsers(recipientIds, pushPayload),
    ])
  } catch (err) {
    console.error('[community-notifications] Error sending push:', err)
  }
}

/**
 * Send FCM push notification for a Direct Message.
 * Notifies the OTHER participant (student or agent).
 */
export async function sendDMNotification(
  chatId: string,
  sender: { userId: string; name: string },
  recipientId: string,
  message: { content: string; imageUrl?: string | null }
) {
  try {
    const body = message.content
      ? `${sender.name}: ${message.content.slice(0, 120)}`
      : `${sender.name} sent a photo`

    const pushPayload = {
      title: sender.name,
      body,
      url: `/community?dm=${chatId}`,
      tag: `dm_${chatId}`,
      importance: 'high' as const,
      sound: 'default' as const,
      ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
    }

    await Promise.allSettled([
      sendPushToUsers([recipientId], pushPayload),
      sendFcmToUsers([recipientId], pushPayload),
    ])
  } catch (err) {
    console.error('[community-notifications] Error sending DM push:', err)
  }
}

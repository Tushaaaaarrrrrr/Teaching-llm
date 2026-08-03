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
    // Fetch course name + enrolled users + muted prefs + per-category opt-out
    // in parallel. The category opt-out (`notifCommunityEnabled = false`) is
    // the global switch from the Flutter Notification Settings page; the
    // per-course mute is the existing inline mute on a specific community.
    const [course, enrollments, mutedPrefs, optedOut, managers] = await Promise.all([
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
      prisma.user.findMany({
        where: { notifCommunityEnabled: false },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { role: 'MANAGER' },
            { isSuperManager: true },
          ],
        },
        select: { id: true },
      }),
    ])

    const mutedSet = new Set(mutedPrefs.map((m) => m.userId))
    const optedOutSet = new Set(optedOut.map((u) => u.id))
    const managerIds = managers.map((m) => m.id)

    const recipientIds = Array.from(new Set([
      ...enrollments
        .map((e) => e.userId)
        .filter(
          (id) =>
            id !== sender.userId &&
            (isManager || !mutedSet.has(id)) &&
            !optedOutSet.has(id)
        ),
      ...managerIds
        .filter((id) => id !== sender.userId && !optedOutSet.has(id))
    ]))

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
    // Respect the recipient's global community-category opt-out.
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { notifCommunityEnabled: true },
    })
    if (!recipient?.notifCommunityEnabled) return

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

/**
 * Send FCM push, create in-app notification, and emit SSE to notify
 * a user they have been tagged in a community chat.
 */
export async function sendTagNotification({
  courseId,
  courseName,
  senderName,
  senderId,
  recipientId,
  messageContent,
  messageId,
}: {
  courseId: string
  courseName: string
  senderName: string
  senderId: string
  recipientId: string
  messageContent: string
  messageId: string
}) {
  try {
    const truncatedContent = messageContent.length > 100
      ? messageContent.slice(0, 97) + '...'
      : messageContent

    const title = `Tagged in ${courseName}`
    const content = `${senderName} tagged you: ${truncatedContent}`

    // 1. Create database notification
    await prisma.notification.create({
      data: {
        userId: recipientId,
        title,
        content,
        type: 'COMMUNITY',
      },
    })

    // 2. Emit SSE to refresh SWR notifications on client
    sseEmitter.emit(`user:${recipientId}:notify`)

    // 3. Send FCM push (respecting global notification preferences)
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { notifCommunityEnabled: true },
    })
    if (recipient?.notifCommunityEnabled) {
      const pushPayload = {
        title,
        body: content,
        url: `/community?course=${courseId}`,
        tag: `tag_${messageId}`,
        importance: 'high' as const,
        sound: 'default' as const,
      }
      await Promise.allSettled([
        sendFcmToUsers([recipientId], pushPayload),
        sendPushToUsers([recipientId], pushPayload),
      ])
    }
  } catch (err) {
    console.error('[community-notifications] Error sending tag notification:', err)
  }
}

/**
 * Send FCM push, create in-app notification, and emit SSE to notify
 * a user that their message has been replied to.
 */
export async function sendReplyNotification({
  courseId,
  courseName,
  senderName,
  senderId,
  recipientId,
  messageContent,
  messageId,
}: {
  courseId: string
  courseName: string
  senderName: string
  senderId: string
  recipientId: string
  messageContent: string
  messageId: string
}) {
  try {
    const truncatedContent = messageContent.length > 100
      ? messageContent.slice(0, 97) + '...'
      : messageContent

    const title = `Reply in ${courseName}`
    const content = `${senderName} replied to your message: ${truncatedContent}`

    // 1. Create database notification
    await prisma.notification.create({
      data: {
        userId: recipientId,
        title,
        content,
        type: 'COMMUNITY',
      },
    })

    // 2. Emit SSE to refresh SWR notifications on client
    sseEmitter.emit(`user:${recipientId}:notify`)

    // 3. Send FCM push (respecting global notification preferences)
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { notifCommunityEnabled: true },
    })
    if (recipient?.notifCommunityEnabled) {
      const pushPayload = {
        title,
        body: content,
        url: `/community?course=${courseId}`,
        tag: `reply_${messageId}`,
        importance: 'high' as const,
        sound: 'default' as const,
      }
      await Promise.allSettled([
        sendFcmToUsers([recipientId], pushPayload),
        sendPushToUsers([recipientId], pushPayload),
      ])
    }
  } catch (err) {
    console.error('[community-notifications] Error sending reply notification:', err)
  }
}

/**
 * Send FCM push, create in-app notification, and emit SSE to notify
 * everyone on a course that a new comment was posted on a lecture.
 */
export async function sendCommentNotification({
  courseId,
  courseName,
  lectureId,
  lectureTitle,
  commentId,
  sender,
  commentText,
}: {
  courseId: string
  courseName: string
  lectureId: string
  lectureTitle: string
  commentId: string
  sender: { userId: string; name: string }
  commentText: string
}) {
  try {
    const [enrollments, optedOut, managers] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
      prisma.user.findMany({
        where: { notifCommunityEnabled: false },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { role: 'MANAGER' },
            { isSuperManager: true },
          ],
        },
        select: { id: true },
      }),
    ])

    const optedOutSet = new Set(optedOut.map((u) => u.id))
    const managerIds = managers.map((m) => m.id)

    const recipientIds = Array.from(new Set([
      ...enrollments
        .map((e) => e.userId)
        .filter((id) => id !== sender.userId && !optedOutSet.has(id)),
      ...managerIds
        .filter((id) => id !== sender.userId && !optedOutSet.has(id))
    ]))

    if (recipientIds.length === 0) return

    const title = `New Lecture Comment`
    const truncatedText = commentText.length > 80 ? commentText.slice(0, 77) + '...' : commentText
    const body = `${sender.name} commented on "${lectureTitle}": "${truncatedText}"`

    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        title,
        content: body,
        type: 'COMMUNITY',
      })),
    })

    recipientIds.forEach((userId) => {
      sseEmitter.emit(`user:${userId}:notify`)
    })

    const pushPayload = {
      title,
      body,
      url: `/courses/${courseId}/lectures/${lectureId}?commentId=${commentId}`,
      tag: `comment_${commentId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers(recipientIds, pushPayload),
      sendFcmToUsers(recipientIds, pushPayload),
    ])
  } catch (err) {
    console.error('[community-notifications] Error sending comment notification:', err)
  }
}


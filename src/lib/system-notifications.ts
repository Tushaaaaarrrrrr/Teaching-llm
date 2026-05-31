import { prisma } from '@/lib/db'
import { sendFcmToUsers } from '@/lib/fcm'

/**
 * Sends a push notification to all enrolled users when a class goes LIVE.
 */
export async function sendLiveClassNotification(
  courseId: string,
  eventTitle: string,
  meetLink?: string | null
) {
  try {
    const [course, enrollments] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
    ])

    const recipientIds = enrollments.map((e) => e.userId)
    if (recipientIds.length === 0) return

    await sendFcmToUsers(recipientIds, {
      title: `Class is Live! 🔴`,
      body: `"${eventTitle}" has started in ${course?.name || 'your class'}. Join now!`,
      url: `/live`,
      tag: `live_event_${courseId}`,
      importance: 'high',
      sound: 'default',
    })
  } catch (err) {
    console.error('[system-notifications] Error sending live class notification:', err)
  }
}

/**
 * Sends a push notification to all enrolled users when a new lecture is added.
 */
export async function sendNewLectureNotification(
  courseId: string,
  lectureTitle: string
) {
  try {
    const [course, enrollments] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
    ])

    const recipientIds = enrollments.map((e) => e.userId)
    if (recipientIds.length === 0) return

    await sendFcmToUsers(recipientIds, {
      title: `New Lecture Added! 📚`,
      body: `"${lectureTitle}" has been added to ${course?.name || 'your class'}.`,
      url: `/study/content-bank?course=${courseId}`,
      tag: `new_lecture_${courseId}`,
      importance: 'high',
      sound: 'default',
    })
  } catch (err) {
    console.error('[system-notifications] Error sending new lecture notification:', err)
  }
}

/**
 * Sends a push notification to the student when a manager replies to their support ticket.
 */
export async function sendSupportReplyNotification(
  ticketId: string,
  senderName: string,
  replyContent: string
) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { studentId: true, title: true },
    })

    if (!ticket || !ticket.studentId) return

    await sendFcmToUsers([ticket.studentId], {
      title: `Support Ticket Replied! 💬`,
      body: `${senderName}: ${replyContent.slice(0, 100)}`,
      url: `/support`,
      tag: `support_reply_${ticketId}`,
      importance: 'high',
      sound: 'default',
    })
  } catch (err) {
    console.error('[system-notifications] Error sending support reply notification:', err)
  }
}

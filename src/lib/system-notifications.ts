import { prisma } from '@/lib/db'
import { sendFcmToUsers } from '@/lib/fcm'

/**
 * Sends a push notification to all enrolled users when a class goes LIVE.
 */
export async function sendLiveClassNotification(
  courseId: string,
  eventTitle: string,
  meetLink?: string | null,
  eventId?: string
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

    const ctaLink = meetLink || (eventId ? `/courses/${courseId}/live/${eventId}` : `/live`)

    await sendFcmToUsers(recipientIds, {
      title: `Class is Live! 🔴`,
      body: `"${eventTitle}" has started in ${course?.name || 'your class'}. Join now!`,
      url: ctaLink,
      ctaText: 'Join now',
      ctaLink: ctaLink,
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

/**
 * Sends a push notification to all enrolled users when a new class is SCHEDULED.
 */
export async function sendClassScheduledNotification(
  courseId: string,
  eventTitle: string,
  startTime: Date,
  meetLink?: string | null,
  eventId?: string
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

    // Format display date in Indian Standard Time (IST)
    const formattedTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(startTime))

    const ctaLink = meetLink || (eventId ? `/courses/${courseId}/live/${eventId}` : `/live`)

    await sendFcmToUsers(recipientIds, {
      title: `New Class Scheduled! 📅`,
      body: `"${eventTitle}" has been scheduled for ${formattedTime} in ${course?.name || 'your class'}.`,
      url: ctaLink,
      ctaText: 'View Details',
      ctaLink: ctaLink,
      tag: `scheduled_event_${eventId || courseId}`,
      importance: 'default',
      sound: 'default',
    })
  } catch (err) {
    console.error('[system-notifications] Error sending class scheduled notification:', err)
  }
}

/**
 * Scans upcoming classes starting within the next 5 minutes and automatically
 * dispatches start alerts to enrolled students.
 */
export async function processScheduledClassStartAlerts() {
  try {
    const now = new Date()
    // Find scheduled classes starting within the next 5 minutes that haven't been notified
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    const dueEvents = await prisma.courseEvent.findMany({
      where: {
        type: 'class',
        status: { in: ['SCHEDULED', 'LIVE'] },
        notifiedStart: false,
        startTime: { lte: fiveMinutesFromNow },
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        meetLink: true,
        startTime: true,
      },
      take: 20, // process in small batches
    })

    if (dueEvents.length === 0) return

    console.log(`[Auto-Start-Alerts] Processing start alerts for ${dueEvents.length} due classes...`)

    await Promise.allSettled(
      dueEvents.map(async (event) => {
        try {
          if (!event.courseId) return

          // Send FCM alert to students
          await sendLiveClassNotification(event.courseId, event.title, event.meetLink, event.id)

          // Mark as notified in DB
          await prisma.courseEvent.update({
            where: { id: event.id },
            data: { notifiedStart: true },
          })
          
          console.log(`[Auto-Start-Alerts] Dispatched class start notification for event ${event.id}`)
        } catch (err) {
          console.error(`[Auto-Start-Alerts] Failed to send notification for event ${event.id}:`, err)
        }
      })
    )
  } catch (err) {
    console.error('[Auto-Start-Alerts] Error processing scheduled class start alerts:', err)
  }
}

import { prisma } from '@/lib/db'
import { sendFcmToUsers } from '@/lib/fcm'
import { sendPushToUsers } from '@/lib/push'
import { sseEmitter } from '@/lib/sse'

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

    const title = `New Lecture Added! 📚`
    const body = `"${lectureTitle}" has been added to ${course?.name || 'your class'}.`

    // 1. Create database notifications in bulk
    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        title,
        content: body,
        type: 'INFO',
      })),
    })

    // 2. Notify connected client via SSE
    recipientIds.forEach((userId) => sseEmitter.emit(`user:${userId}:notify`))

    // 3. Send Web Push and FCM in parallel
    const pushPayload = {
      title,
      body,
      url: `/study/content-bank?course=${courseId}`,
      tag: `new_lecture_${courseId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers(recipientIds, pushPayload),
      sendFcmToUsers(recipientIds, pushPayload),
    ])
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

    const title = `Support Ticket Replied! 💬`
    const body = `${senderName}: ${replyContent.slice(0, 100)}`

    // 1. Create database notification for student
    await prisma.notification.create({
      data: {
        userId: ticket.studentId,
        title,
        content: body,
        type: 'INFO',
      },
    })

    // 2. Notify connected client via SSE
    sseEmitter.emit(`user:${ticket.studentId}:notify`)

    // 3. Send Web Push and FCM in parallel
    const pushPayload = {
      title,
      body,
      url: `/support`,
      tag: `support_reply_${ticketId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers([ticket.studentId], pushPayload),
      sendFcmToUsers([ticket.studentId], pushPayload),
    ])
  } catch (err) {
    console.error('[system-notifications] Error sending support reply notification:', err)
  }
}

/**
 * Sends a notification to the student when an agent joins their live chat.
 */
export async function sendAgentJoinedChatNotification(
  chatId: string,
  agentName: string
) {
  try {
    const chat = await prisma.chatSession.findUnique({
      where: { id: chatId },
      select: { studentId: true },
    })

    if (!chat || !chat.studentId) return

    const title = 'Agent Joined Chat 💬'
    const body = `${agentName} has joined your live chat support session.`

    // 1. Create database notification
    await prisma.notification.create({
      data: {
        userId: chat.studentId,
        title,
        content: body,
        type: 'SUCCESS',
      },
    })

    // 2. Notify connected client via SSE
    sseEmitter.emit(`user:${chat.studentId}:notify`)

    // 3. Send Web Push and FCM in parallel
    const pushPayload = {
      title,
      body,
      url: '/support',
      tag: `chat_joined_${chatId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers([chat.studentId], pushPayload),
      sendFcmToUsers([chat.studentId], pushPayload),
    ])
  } catch (err) {
    console.error('[system-notifications] Error sending agent joined chat notification:', err)
  }
}

/**
 * Helper to fetch all manager and super-manager user IDs.
 */
async function getManagerIds(): Promise<string[]> {
  const managers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'MANAGER' },
        { isSuperManager: true },
      ],
    },
    select: { id: true },
  })
  return managers.map((m) => m.id)
}

/**
 * Sends a notification to a student and all managers when they enroll/purchase a course.
 */
export async function sendCourseEnrollmentNotification(
  userId: string,
  courseId: string,
  amount: number = 0
) {
  try {
    const [user, course, managerIds] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      getManagerIds(),
    ])

    if (!user || !course) return

    // --- 1. Student Notification ---
    const studentTitle = 'Course Purchased! 🎉'
    const studentBody = `You are now enrolled in "${course.name}". Start learning today!`

    await prisma.notification.create({
      data: {
        userId,
        title: studentTitle,
        content: studentBody,
        type: 'SUCCESS',
      },
    })
    sseEmitter.emit(`user:${userId}:notify`)

    const studentPushPayload = {
      title: studentTitle,
      body: studentBody,
      url: `/study/content-bank?course=${courseId}`,
      tag: `purchase_${courseId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers([userId], studentPushPayload),
      sendFcmToUsers([userId], studentPushPayload),
    ])

    // --- 2. Manager Notification ---
    if (managerIds.length > 0) {
      const managerTitle = 'New Course Purchase! 💰'
      const managerBody = `${user.name} purchased "${course.name}"${amount ? ` for ₹${amount}` : ''}.`

      await prisma.notification.createMany({
        data: managerIds.map((mId) => ({
          userId: mId,
          title: managerTitle,
          content: managerBody,
          type: 'INFO',
        })),
      })

      managerIds.forEach((mId) => sseEmitter.emit(`user:${mId}:notify`))
      sseEmitter.emit('system:admin_unread')

      const managerPushPayload = {
        title: managerTitle,
        body: managerBody,
        url: `/admin`,
        tag: `manager_purchase_${userId}_${courseId}`,
        importance: 'high' as const,
        sound: 'default' as const,
      }

      await Promise.allSettled([
        sendPushToUsers(managerIds, managerPushPayload),
        sendFcmToUsers(managerIds, managerPushPayload),
      ])
    }
  } catch (err) {
    console.error('[system-notifications] Error sending course purchase notification:', err)
  }
}

/**
 * Sends a notification to all managers when a student submits a new support ticket.
 */
export async function sendNewTicketNotificationToManagers(
  ticketId: string,
  studentName: string,
  ticketTitle: string
) {
  try {
    const managerIds = await getManagerIds()
    if (managerIds.length === 0) return

    const title = 'New Support Ticket 🎫'
    const body = `${studentName} opened a new ticket: "${ticketTitle.slice(0, 50)}"`

    await prisma.notification.createMany({
      data: managerIds.map((mId) => ({
        userId: mId,
        title,
        content: body,
        type: 'INFO',
      })),
    })

    managerIds.forEach((mId) => sseEmitter.emit(`user:${mId}:notify`))
    sseEmitter.emit('system:admin_unread')

    const pushPayload = {
      title,
      body,
      url: `/support`,
      tag: `new_ticket_${ticketId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers(managerIds, pushPayload),
      sendFcmToUsers(managerIds, pushPayload),
    ])
  } catch (err) {
    console.error('[system-notifications] Error sending new ticket notification to managers:', err)
  }
}

/**
 * Sends a notification to all managers when a student replies to a support ticket.
 */
export async function sendTicketReplyNotificationToManagers(
  ticketId: string,
  studentName: string,
  replyContent: string
) {
  try {
    const [ticket, managerIds] = await Promise.all([
      prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { title: true },
      }),
      getManagerIds(),
    ])

    if (!ticket || managerIds.length === 0) return

    const title = 'Support Ticket Reply! 💬'
    const body = `${studentName} replied to "${ticket.title.slice(0, 30)}": ${replyContent.slice(0, 50)}`

    await prisma.notification.createMany({
      data: managerIds.map((mId) => ({
        userId: mId,
        title,
        content: body,
        type: 'INFO',
      })),
    })

    managerIds.forEach((mId) => sseEmitter.emit(`user:${mId}:notify`))
    sseEmitter.emit('system:admin_unread')

    const pushPayload = {
      title,
      body,
      url: `/support`,
      tag: `ticket_reply_${ticketId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers(managerIds, pushPayload),
      sendFcmToUsers(managerIds, pushPayload),
    ])
  } catch (err) {
    console.error('[system-notifications] Error sending ticket reply notification to managers:', err)
  }
}

/**
 * Sends a notification to all managers when a student starts a new live support chat.
 */
export async function sendNewLiveChatNotificationToManagers(
  chatId: string,
  studentName: string,
  initialMessage?: string
) {
  try {
    const managerIds = await getManagerIds()
    if (managerIds.length === 0) return

    const title = 'New Live Chat Support Request 💬'
    const body = `${studentName} started a live chat: "${(initialMessage || 'No initial message').slice(0, 50)}"`

    await prisma.notification.createMany({
      data: managerIds.map((mId) => ({
        userId: mId,
        title,
        content: body,
        type: 'INFO',
      })),
    })

    managerIds.forEach((mId) => sseEmitter.emit(`user:${mId}:notify`))
    sseEmitter.emit('system:admin_unread')

    const pushPayload = {
      title,
      body,
      url: `/support`,
      tag: `new_chat_${chatId}`,
      importance: 'high' as const,
      sound: 'default' as const,
    }

    await Promise.allSettled([
      sendPushToUsers(managerIds, pushPayload),
      sendFcmToUsers(managerIds, pushPayload),
    ])
  } catch (err) {
    console.error('[system-notifications] Error sending new live chat notification to managers:', err)
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

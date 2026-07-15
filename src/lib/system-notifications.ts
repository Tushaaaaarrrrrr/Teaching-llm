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
    const [course, enrollments, managerIds] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
      getManagerIds(),
    ])

    const recipientIds = Array.from(new Set([
      ...enrollments.map((e) => e.userId),
      ...managerIds
    ]))
    if (recipientIds.length === 0) return

    const ctaLink = meetLink || (eventId ? `/courses/${courseId}/live/${eventId}` : `/live`)

    await sendFcmToUsers(recipientIds, {
      title: `Class is Live`,
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
    await prisma.lectureNotificationQueue.create({
      data: {
        courseId,
        title: lectureTitle,
      },
    })
    console.log(`[system-notifications] Queued lecture notification for course ${courseId}: "${lectureTitle}"`)
  } catch (err) {
    console.error('[system-notifications] Error queueing lecture notification:', err)
  }
}

/**
 * Processes batched/debounced lecture notifications in the queue.
 * Dispatches a notification for a course only if the latest upload was >= 15 minutes ago.
 */
export async function processPendingLectureAlerts() {
  try {
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

    // 1. Get all entries in the queue
    const queuedEntries = await prisma.lectureNotificationQueue.findMany({
      orderBy: { createdAt: 'asc' },
    })

    if (queuedEntries.length === 0) return

    // 2. Group entries by courseId
    const groups: Record<string, typeof queuedEntries> = {}
    for (const entry of queuedEntries) {
      if (!groups[entry.courseId]) {
        groups[entry.courseId] = []
      }
      groups[entry.courseId].push(entry)
    }

    // 3. Process groups where the last added lecture is at least 15 minutes old
    for (const [courseId, entries] of Object.entries(groups)) {
      const latestEntry = entries[entries.length - 1]
      if (latestEntry.createdAt.getTime() <= fifteenMinutesAgo.getTime()) {
        console.log(`[Batch-Lecture-Alerts] Dispatching notification for ${entries.length} lectures in course ${courseId}...`)

        const [course, enrollments, managerIds] = await Promise.all([
          prisma.course.findUnique({
            where: { id: courseId },
            select: { name: true },
          }),
          prisma.enrollment.findMany({
            where: { courseId },
            select: { userId: true },
          }),
          getManagerIds(),
        ])

        const recipientIds = Array.from(new Set([
          ...enrollments.map((e) => e.userId),
          ...managerIds
        ]))

        if (recipientIds.length > 0) {
          const title = entries.length === 1 ? `New Lecture Added` : `New Lectures Added`
          let body = ''
          if (entries.length === 1) {
            body = `"${entries[0].title}" has been added to ${course?.name || 'your class'}.`
          } else {
            body = `${entries.length} new lectures have been added to ${course?.name || 'your class'}.`
          }

          // Create database notifications in bulk
          await prisma.notification.createMany({
            data: recipientIds.map((userId) => ({
              userId,
              title,
              content: body,
              type: 'INFO',
            })),
          })

          // SSE Emitter
          recipientIds.forEach((userId) => sseEmitter.emit(`user:${userId}:notify`))

          // Web Push and FCM
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
        }

        // Delete processed queue entries
        const entryIds = entries.map((e) => e.id)
        await prisma.lectureNotificationQueue.deleteMany({
          where: { id: { in: entryIds } },
        })
        console.log(`[Batch-Lecture-Alerts] Successfully completed and cleared ${entries.length} items from queue for course ${courseId}`)
      }
    }
  } catch (err) {
    console.error('[Batch-Lecture-Alerts] Error processing pending lecture alerts:', err)
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

    const managerIds = await getManagerIds()
    const recipientIds = Array.from(new Set([ticket.studentId, ...managerIds]))

    const title = `Support Ticket Replied! 💬`
    const body = `${senderName}: ${replyContent.slice(0, 100)}`

    // 1. Create database notification for student and managers
    await prisma.notification.createMany({
      data: recipientIds.map(userId => ({
        userId,
        title,
        content: body,
        type: 'INFO',
      })),
    })

    // 2. Notify connected clients via SSE
    recipientIds.forEach(userId => sseEmitter.emit(`user:${userId}:notify`))

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
      sendPushToUsers(recipientIds, pushPayload),
      sendFcmToUsers(recipientIds, pushPayload),
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

    const managerIds = await getManagerIds()
    const recipientIds = Array.from(new Set([chat.studentId, ...managerIds]))

    const title = 'Agent Joined Chat 💬'
    const body = `${agentName} has joined your live chat support session.`

    // 1. Create database notification
    await prisma.notification.createMany({
      data: recipientIds.map(userId => ({
        userId,
        title,
        content: body,
        type: 'SUCCESS',
      })),
    })

    // 2. Notify connected client via SSE
    recipientIds.forEach(userId => sseEmitter.emit(`user:${userId}:notify`))

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
      sendPushToUsers(recipientIds, pushPayload),
      sendFcmToUsers(recipientIds, pushPayload),
    ])
  } catch (err) {
    console.error('[system-notifications] Error sending agent joined chat notification:', err)
  }
}

/**
 * Helper to fetch all manager and super-manager user IDs.
 */
export async function getManagerIds(): Promise<string[]> {
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
    const [course, enrollments, managerIds] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
      getManagerIds(),
    ])

    const recipientIds = Array.from(new Set([
      ...enrollments.map((e) => e.userId),
      ...managerIds
    ]))
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
      title: `New Class Scheduled`,
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
 * Sends a push notification to all enrolled users when a class is RESCHEDULED.
 */
export async function sendClassRescheduledNotification(
  courseId: string,
  eventTitle: string,
  startTime: Date,
  meetLink?: string | null,
  eventId?: string
) {
  try {
    const [course, enrollments, managerIds] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
      getManagerIds(),
    ])

    const recipientIds = Array.from(new Set([
      ...enrollments.map((e) => e.userId),
      ...managerIds
    ]))
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
      title: `Class Rescheduled`,
      body: `"${eventTitle}" in ${course?.name || 'your class'} has been rescheduled to ${formattedTime}.`,
      url: ctaLink,
      ctaText: 'View Details',
      ctaLink: ctaLink,
      tag: `rescheduled_event_${eventId || courseId}`,
      importance: 'default',
      sound: 'default',
    })
  } catch (err) {
    console.error('[system-notifications] Error sending class rescheduled notification:', err)
  }
}

/**
 * Sends a push notification to all enrolled users when a class is CANCELED.
 */
export async function sendClassCanceledNotification(
  courseId: string,
  eventTitle: string,
  startTime: Date,
  eventId?: string
) {
  try {
    const [course, enrollments, managerIds] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
      getManagerIds(),
    ])

    const recipientIds = Array.from(new Set([
      ...enrollments.map((e) => e.userId),
      ...managerIds
    ]))
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

    await sendFcmToUsers(recipientIds, {
      title: `Class Canceled`,
      body: `The class "${eventTitle}" in ${course?.name || 'your class'} scheduled for ${formattedTime} has been canceled.`,
      url: '/calendar',
      tag: `canceled_event_${eventId || courseId}`,
      importance: 'high',
      sound: 'default',
    })
  } catch (err) {
    console.error('[system-notifications] Error sending class canceled notification:', err)
  }
}

/**
 * Scans upcoming and ongoing classes within specific timing windows
 * and automatically dispatches pre-start and post-start notifications.
 */
export async function processScheduledClassStartAlerts() {
  try {
    const now = new Date()
    // We scan classes from 20 minutes in the past up to 40 minutes in the future
    const fortyMinutesFromNow = new Date(now.getTime() + 40 * 60 * 1000)
    const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000)

    const dueEvents = await prisma.courseEvent.findMany({
      where: {
        type: 'class',
        status: { in: ['SCHEDULED', 'LIVE'] },
        startTime: {
          gte: twentyMinutesAgo,
          lte: fortyMinutesFromNow,
        },
        OR: [
          { notified15mBefore: false },
          { notifiedAtStart: false },
        ],
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        meetLink: true,
        startTime: true,
        notified15mBefore: true,
        notifiedAtStart: true,
      },
      take: 20, // process in small batches
    })

    if (dueEvents.length === 0) return

    console.log(`[Auto-Start-Alerts] Processing start alerts for ${dueEvents.length} due classes...`)

    await Promise.allSettled(
      dueEvents.map(async (event) => {
        try {
          if (!event.courseId) return

          const [course, enrollments, managerIds] = await Promise.all([
            prisma.course.findUnique({
              where: { id: event.courseId },
              select: { name: true },
            }),
            prisma.enrollment.findMany({
              where: { courseId: event.courseId },
              select: { userId: true },
            }),
            getManagerIds(),
          ])

          const recipientIds = Array.from(new Set([
            ...enrollments.map((e) => e.userId),
            ...managerIds
          ]))
          if (recipientIds.length === 0) return

          const ctaLink = event.meetLink || `/courses/${event.courseId}/live/${event.id}`
          const diffMinutes = (event.startTime.getTime() - now.getTime()) / (60 * 1000)

          const updateData: Record<string, any> = {}

          // 1. 15 Minutes Before Start
          if (diffMinutes <= 15 && diffMinutes > 0 && !event.notified15mBefore) {
            await sendFcmToUsers(recipientIds, {
              title: 'Class Starting in 15 Minutes',
              body: `"${event.title}" starts in 15 minutes. Please join the session.`,
              url: ctaLink,
              ctaText: 'Join Class',
              ctaLink: ctaLink,
              tag: `alert_15m_${event.id}`,
              importance: 'high',
              sound: 'default',
            })
            updateData.notified15mBefore = true
            console.log(`[Auto-Start-Alerts] Sent 15m before alert for class: ${event.title}`)
          }

          // 2. At Class Start
          if (diffMinutes <= 0 && diffMinutes > -10 && !event.notifiedAtStart) {
            await sendFcmToUsers(recipientIds, {
              title: 'Class Starting Now',
              body: `Your instructor is here and "${event.title}" is starting now. Please join the session.`,
              url: ctaLink,
              ctaText: 'Join Now',
              ctaLink: ctaLink,
              tag: `alert_start_${event.id}`,
              importance: 'high',
              sound: 'class_start_tone',
              channelId: 'class_start_alerts',
            })
            updateData.notifiedAtStart = true
            updateData.notifiedStart = true // Keep compatibility with existing notifiedStart field
            console.log(`[Auto-Start-Alerts] Sent at-start alert for class: ${event.title}`)
          }

          // Persist the updated notification flags to the database
          if (Object.keys(updateData).length > 0) {
            await prisma.courseEvent.update({
              where: { id: event.id },
              data: updateData,
            })
          }
        } catch (err) {
          console.error(`[Auto-Start-Alerts] Failed to send notification for event ${event.id}:`, err)
        }
      })
    )
  } catch (err) {
    console.error('[Auto-Start-Alerts] Error processing scheduled class start alerts:', err)
  }
}

/**
 * Compiles today's class schedule and sends personalized schedule notifications
 * at 1 PM IST to students enrolled in those courses.
 */
export async function sendDailyScheduleNotification() {
  try {
    const { startOfDay, endOfDay } = require('@/lib/date-utils').getISTDayBoundaries()

    // Find all today's non-cancelled classes
    const todaysEvents = await prisma.courseEvent.findMany({
      where: {
        type: 'class',
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        courseId: true,
        isGlobal: true,
      },
      orderBy: { startTime: 'asc' },
    })

    if (todaysEvents.length === 0) {
      console.log('[Daily-Schedule-Notification] No classes scheduled today.')
      return
    }

    // Find all active students with their enrollments
    const students = await prisma.user.findMany({
      where: { isTerminated: false },
      select: {
        id: true,
        enrollments: {
          select: { courseId: true }
        }
      }
    })

    console.log(`[Daily-Schedule-Notification] Processing schedule notification for ${students.length} students...`)

    await Promise.allSettled(
      students.map(async (student) => {
        const studentCourseIds = student.enrollments.map(e => e.courseId)
        const myEvents = todaysEvents.filter(event => 
          event.isGlobal || (event.courseId && studentCourseIds.includes(event.courseId))
        )

        if (myEvents.length === 0) return

        let body = ''
        if (myEvents.length === 1) {
          const event = myEvents[0]
          const formattedTime = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }).format(new Date(event.startTime))
          body = `You have class today: "${event.title}" starts at ${formattedTime}.`
        } else {
          const classDetails = myEvents.map(event => {
            const formattedTime = new Intl.DateTimeFormat('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }).format(new Date(event.startTime))
            return `"${event.title}" at ${formattedTime}`
          }).join(', ')
          body = `You have ${myEvents.length} classes today: ${classDetails}.`
        }

        await sendFcmToUsers([student.id], {
          title: "Today's Class Schedule",
          body,
          url: '/calendar',
          tag: 'daily_schedule',
          importance: 'default',
          sound: 'default',
        })
      })
    )
  } catch (err) {
    console.error('[Daily-Schedule-Notification] Error sending daily schedule notifications:', err)
  }
}


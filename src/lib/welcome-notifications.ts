import { prisma } from '@/lib/db'

/**
 * Schedules a welcome sequence of notifications staggered 1 hour apart,
 * starting 2 hours after registration/signup.
 *
 * Hour 2: "Choose yourself. 💪" (Sign up now)
 * Hour 3: "We can't wait anymore! 😡" (Explore now)
 * Hour 4: "Ignoring me? 🥺" (Sign up now)
 * Hour 5: "We're about to blow your mind! 🤯" (Open now)
 */
export async function scheduleWelcomeSequence(userId: string) {
  try {
    // 1. Delete any existing pending welcome notifications for this user
    await prisma.scheduledUserNotification.deleteMany({
      where: { userId, status: 'PENDING' },
    })

    const now = new Date()

    // 2. Create the 4 staggered notifications
    const dripCampaigns = [
      {
        hoursOffset: 2,
        title: 'Choose yourself. 💪',
        content: 'Take the first step towards achieving your dreams. Kickstart your journey to crack it, today. 🚀',
        ctaText: 'Sign up now',
        ctaLink: '/',
      },
      {
        hoursOffset: 3,
        title: "We can't wait anymore! 😡",
        content: "It's been over 2 hours and you haven't signed up yet. Why delay the path to your future?",
        ctaText: 'Explore now',
        ctaLink: '/',
      },
      {
        hoursOffset: 4,
        title: 'Ignoring me? 🥺',
        content: 'You downloaded the app but haven\'t used it at all! Your prep for a bright future awaits. 🔥',
        ctaText: 'Sign up now',
        ctaLink: '/',
      },
      {
        hoursOffset: 5,
        title: "We're about to blow your mind! 🤯",
        content: 'Open the app and experience learning like never before! 🚀',
        ctaText: 'Open now',
        ctaLink: '/',
      },
    ]

    await prisma.scheduledUserNotification.createMany({
      data: dripCampaigns.map((d) => {
        const scheduledTime = new Date(now.getTime() + d.hoursOffset * 60 * 60 * 1000)
        return {
          userId,
          title: d.title,
          content: d.content,
          ctaText: d.ctaText,
          ctaLink: d.ctaLink,
          scheduledFor: scheduledTime,
          status: 'PENDING',
        }
      }),
    })

    console.log(`[welcome-notifications] Successfully scheduled drip campaign for user: ${userId}`)
  } catch (err) {
    console.error('[welcome-notifications] Error scheduling sequence:', err)
  }
}

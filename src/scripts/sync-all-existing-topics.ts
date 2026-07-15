import { prisma } from '../lib/db'
import { firebaseAdmin } from '../lib/firebase-admin'

async function sync() {
  if (!firebaseAdmin) {
    console.error('Firebase Admin not initialized. Cannot sync topics.')
    return
  }

  try {
    console.log('Fetching active device tokens from database...')
    const tokens = await prisma.fcmDeviceToken.findMany({
      select: {
        userId: true,
        token: true
      }
    })

    if (tokens.length === 0) {
      console.log('No active device tokens found in database.')
      return
    }

    console.log(`Found ${tokens.length} active device token records. Grouping by user...`)

    // Group tokens by userId
    const userTokensMap: Record<string, string[]> = {}
    for (const t of tokens) {
      if (!userTokensMap[t.userId]) {
        userTokensMap[t.userId] = []
      }
      userTokensMap[t.userId].push(t.token)
    }

    const userIds = Object.keys(userTokensMap)
    console.log(`Syncing topics for ${userIds.length} distinct users...`)

    for (const userId of userIds) {
      const userTokens = userTokensMap[userId]

      const [user, enrollments] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, role: true }
        }),
        prisma.enrollment.findMany({
          where: { userId },
          select: { courseId: true }
        })
      ])

      if (!user) {
        console.log(`Skipping: User with ID ${userId} not found.`)
        continue
      }

      console.log(`Processing user: ${user.email} (${user.role}) with ${userTokens.length} token(s)`)

      // 1. Subscribe to each enrolled course topic
      for (const enrollment of enrollments) {
        const topicName = `course_${enrollment.courseId}`
        await firebaseAdmin.messaging().subscribeToTopic(userTokens, topicName)
        console.log(`  - Subscribed to course topic: ${topicName}`)
      }

      // 2. Subscribe to student announcements if role is STUDENT
      if (user.role === 'STUDENT') {
        const globalTopic = 'student_announcements'
        await firebaseAdmin.messaging().subscribeToTopic(userTokens, globalTopic)
        console.log(`  - Subscribed to global topic: ${globalTopic}`)
      }
    }

    console.log('Sync finished successfully!')
  } catch (err) {
    console.error('Error during synchronization:', err)
  } finally {
    await prisma.$disconnect()
  }
}

sync()

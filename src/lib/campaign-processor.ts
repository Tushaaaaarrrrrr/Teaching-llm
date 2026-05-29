import { prisma } from '@/lib/db'
import { sendFcmToUsers } from '@/lib/fcm'
import { sendPushToUsers } from '@/lib/push'
import { sseEmitter } from '@/lib/sse'

/**
 * Resolves a campaign's audience target filter and returns a unique list of user IDs.
 */
export async function getCampaignTargetUserIds(targetType: string, targetId: string | null): Promise<string[]> {
  try {
    if (targetType === 'ALL' || !targetId) {
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', isTerminated: false },
        select: { id: true },
      })
      return students.map((s) => s.id)
    }

    if (targetType === 'COURSE') {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          courseId: targetId,
          user: { role: 'STUDENT', isTerminated: false },
        },
        select: { userId: true },
      })
      return Array.from(new Set(enrollments.map((e) => e.userId)))
    }

    if (targetType === 'BUNDLE') {
      // Find courses included in this bundle
      const bundleCourses = await prisma.courseBundleCourse.findMany({
        where: { bundleId: targetId },
        select: { courseId: true },
      })
      const courseIds = bundleCourses.map((bc) => bc.courseId)

      // Find enrollments in any of these courses
      const enrollments = await prisma.enrollment.findMany({
        where: {
          courseId: { in: courseIds },
          user: { role: 'STUDENT', isTerminated: false },
        },
        select: { userId: true },
      })

      // Also find users directly assigned to the bundle
      const bundleAssignments = await prisma.userCourseBundleAssignment.findMany({
        where: {
          bundleId: targetId,
          user: { role: 'STUDENT', isTerminated: false },
        },
        select: { userId: true },
      })

      const userIds = [
        ...enrollments.map((e) => e.userId),
        ...bundleAssignments.map((ba) => ba.userId),
      ]

      return Array.from(new Set(userIds))
    }

    return []
  } catch (error) {
    console.error('[Campaign Targets] Error resolving target users:', error)
    return []
  }
}

/**
 * Sends a rich notification campaign to target user segments.
 */
export async function sendNotificationCampaign(campaignId: string) {
  try {
    const campaign = await prisma.notificationCampaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign || campaign.status === 'SENT') return

    console.log(`[Notification Campaign] Processing campaign "${campaign.title}" (${campaign.id})`)

    // 1. Resolve targets
    const targetUserIds = await getCampaignTargetUserIds(campaign.targetType, campaign.targetId)

    if (targetUserIds.length === 0) {
      console.warn(`[Notification Campaign] No target users found for campaign "${campaign.title}"`)
      await prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: { status: 'SENT', sentAt: new Date() },
      })
      return
    }

    // 2. Create internal Notifications in database
    const truncatedContent = campaign.body.length > 100
      ? campaign.body.slice(0, 97) + '...'
      : campaign.body

    await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        title: campaign.title,
        content: truncatedContent,
        type: 'CAMPAIGN',
      })),
    })

    // 3. Emit SSE updates
    targetUserIds.forEach((userId) => sseEmitter.emit(`user:${userId}:notify`))

    // 4. Send Rich Push Notifications (Web Push & FCM) in parallel
    const pushPayload = {
      title: campaign.title,
      body: campaign.body,
      imageUrl: campaign.imageUrl || undefined,
      ctaText: campaign.ctaText || undefined,
      ctaLink: campaign.ctaLink || undefined,
      tag: `campaign-${campaign.id}`,
    }

    await Promise.allSettled([
      sendPushToUsers(targetUserIds, pushPayload),
      sendFcmToUsers(targetUserIds, pushPayload),
    ])

    // 5. Update campaign status
    await prisma.notificationCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    console.log(
      `[Notification Campaign] Successfully dispatched campaign "${campaign.title}" to ${targetUserIds.length} users`
    )
  } catch (error) {
    console.error(`[Notification Campaign] Error processing campaign ${campaignId}:`, error)
    await prisma.notificationCampaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' },
    })
  }
}

/**
 * Finds and executes pending scheduled notification campaigns that are due.
 */
export async function processScheduledCampaigns() {
  try {
    const now = new Date()

    const dueCampaigns = await prisma.notificationCampaign.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
      select: { id: true },
    })

    if (dueCampaigns.length === 0) return { processed: 0 }

    console.log(`[Campaign Scheduler] Found ${dueCampaigns.length} scheduled campaigns due for dispatch`)

    for (const c of dueCampaigns) {
      await sendNotificationCampaign(c.id)
    }

    return { processed: dueCampaigns.length }
  } catch (error) {
    console.error('[Campaign Scheduler] Error processing scheduled campaigns:', error)
    return { processed: 0 }
  }
}

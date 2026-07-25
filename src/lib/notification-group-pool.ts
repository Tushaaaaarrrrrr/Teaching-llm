import { prisma } from '@/lib/db'

const GOOGLE_WORKSPACE_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim().toLowerCase() || ''

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function parseNotificationGroupEmails(emailsStr?: string | null): string[] {
  if (!emailsStr) return []
  const parsed = emailsStr.split(',').map(e => normalizeEmail(e)).filter(e => e)
  return Array.from(new Set(parsed)) // Deduplicate
}

export function validateNotificationGroupEmail(rawEmail?: string | null): string {
  if (!rawEmail || !rawEmail.trim()) {
    throw new Error('Notification Group Email cannot be empty')
  }

  const email = normalizeEmail(rawEmail)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(email)) {
    throw new Error(`Notification Group Email "${rawEmail}" is not a valid email address`)
  }

  if (GOOGLE_WORKSPACE_DOMAIN && !email.endsWith(`@${GOOGLE_WORKSPACE_DOMAIN}`)) {
    throw new Error(`Notification Group Email "${rawEmail}" must belong to @${GOOGLE_WORKSPACE_DOMAIN}`)
  }

  return email
}

/**
 * Queue a notification group sync job for Google Workspace API processing
 */
export async function queueNotificationGroupSyncJob(
  db: any,
  {
    userEmail,
    groupEmail,
    action,
  }: {
    userEmail: string
    groupEmail: string
    action: 'ADD' | 'REMOVE'
  }
) {
  const normalizedUserEmail = normalizeEmail(userEmail)
  const normalizedGroupEmail = normalizeEmail(groupEmail)

  if (!normalizedUserEmail || !normalizedGroupEmail) return null

  // Check if identical pending job already exists
  const existingJob = await db.groupSyncJob.findFirst({
    where: {
      userEmail: normalizedUserEmail,
      groupEmail: normalizedGroupEmail,
      action,
      groupType: 'NOTIFICATION',
      status: 'PENDING',
    },
  })

  if (existingJob) return existingJob

  const job = await db.groupSyncJob.create({
    data: {
      userEmail: normalizedUserEmail,
      groupEmail: normalizedGroupEmail,
      action,
      groupType: 'NOTIFICATION',
      status: 'PENDING',
    },
  })

  // Trigger async sync processing
  try {
    const { triggerGoogleGroupSyncProcessing } = await import('@/lib/google-group-sync')
    process.nextTick(() => triggerGoogleGroupSyncProcessing())
  } catch (err) {
    console.error('[Notification Pool Sync] Failed to trigger sync processing:', err)
  }

  return job
}

/**
 * Automatically assign a user to the current active notification group in the pool.
 * If all pools are full (500 limit), flags user for Overflow Queue (`isNotificationGroupPending: true`).
 */
export async function getOrAssignNotificationGroup(db: any, userEmail: string) {
  const normalizedUserEmail = normalizeEmail(userEmail)
  if (!normalizedUserEmail) return { assigned: false, reason: 'Invalid email' }

  const targetUser = await db.user.findUnique({
    where: { email: normalizedUserEmail },
    select: { id: true, email: true, notificationGroupEmails: true, isNotificationGroupPending: true },
  })

  if (!targetUser) return { assigned: false, reason: 'User not found' }

  const currentGroups = parseNotificationGroupEmails(targetUser.notificationGroupEmails)

  // Find active pools with capacity left
  const activePools = await db.notificationGroupPool.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  let availablePool = activePools.find((pool: any) => pool.currentCount < pool.maxCapacity)

  // If no pool found, check if we need to recalibrate currentCount from DB
  if (!availablePool && activePools.length > 0) {
    for (const pool of activePools) {
      const actualCount = await db.user.count({
        where: {
          notificationGroupEmails: {
            contains: pool.groupEmail,
          },
        },
      })
      if (actualCount !== pool.currentCount) {
        await db.notificationGroupPool.update({
          where: { id: pool.id },
          data: { currentCount: actualCount },
        })
        if (actualCount < pool.maxCapacity) {
          availablePool = { ...pool, currentCount: actualCount }
          break
        }
      }
    }
  }

  // If still no pool with space available -> Flag user in Overflow Queue
  if (!availablePool) {
    if (!targetUser.isNotificationGroupPending) {
      await db.user.update({
        where: { id: targetUser.id },
        data: { isNotificationGroupPending: true },
      })
    }
    return {
      assigned: false,
      pending: true,
      reason: 'All notification group pools are full (500 limit reached). User added to Overflow Queue.',
    }
  }

  // Check if user is already in this group
  if (currentGroups.includes(availablePool.groupEmail)) {
    if (targetUser.isNotificationGroupPending) {
      await db.user.update({
        where: { id: targetUser.id },
        data: { isNotificationGroupPending: false },
      })
    }
    return { assigned: true, groupEmail: availablePool.groupEmail, newlyAssigned: false }
  }

  // Append new group email with strict deduplication
  const updatedGroups = Array.from(new Set([...currentGroups, availablePool.groupEmail]))

  await db.user.update({
    where: { id: targetUser.id },
    data: {
      notificationGroupEmails: updatedGroups.join(','),
      isNotificationGroupPending: false,
    },
  })

  // Increment pool count
  await db.notificationGroupPool.update({
    where: { id: availablePool.id },
    data: { currentCount: { increment: 1 } },
  })

  // Queue ADD sync job
  await queueNotificationGroupSyncJob(db, {
    userEmail: targetUser.email,
    groupEmail: availablePool.groupEmail,
    action: 'ADD',
  })

  return {
    assigned: true,
    groupEmail: availablePool.groupEmail,
    newlyAssigned: true,
    totalUserGroups: updatedGroups,
  }
}

/**
 * Flush the Overflow Queue: Automatically assign users waiting in `isNotificationGroupPending`
 * to available pool emails.
 */
export async function flushNotificationGroupOverflowQueue(db: any) {
  const pendingUsers = await db.user.findMany({
    where: { isNotificationGroupPending: true },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  })

  if (pendingUsers.length === 0) {
    return { totalPending: 0, assigned: 0, remainingPending: 0 }
  }

  let assignedCount = 0

  for (const user of pendingUsers) {
    const res = await getOrAssignNotificationGroup(db, user.email)
    if (res.assigned && res.newlyAssigned) {
      assignedCount++
    } else if (res.pending) {
      // Pools filled up again during flush
      break
    }
  }

  const remainingPending = await db.user.count({
    where: { isNotificationGroupPending: true },
  })

  return {
    totalPending: pendingUsers.length,
    assigned: assignedCount,
    remainingPending,
  }
}

/**
 * Add a new notification group email to the pool and immediately flush overflow queue.
 */
export async function addNotificationGroupToPool(db: any, groupEmail: string, maxCapacity = 500) {
  const validatedEmail = validateNotificationGroupEmail(groupEmail)

  let pool = await db.notificationGroupPool.findUnique({
    where: { groupEmail: validatedEmail },
  })

  if (pool) {
    // Re-activate if disabled and update maxCapacity
    pool = await db.notificationGroupPool.update({
      where: { id: pool.id },
      data: { isActive: true, maxCapacity },
    })
  } else {
    pool = await db.notificationGroupPool.create({
      data: {
        groupEmail: validatedEmail,
        maxCapacity,
        currentCount: 0,
        isActive: true,
      },
    })
  }

  // Auto-flush any pending overflow users into this new pool
  const flushResult = await flushNotificationGroupOverflowQueue(db)

  return { pool, flushResult }
}

/**
 * Add a specific notification group email to a user (preserving existing groups & deduplicating).
 */
export async function addNotificationGroupToUser(db: any, userId: string, newGroupEmail: string) {
  const validatedEmail = validateNotificationGroupEmail(newGroupEmail)

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, notificationGroupEmails: true },
  })

  if (!user) throw new Error('User not found')

  const existingGroups = parseNotificationGroupEmails(user.notificationGroupEmails)

  if (existingGroups.includes(validatedEmail)) {
    return { updated: false, groups: existingGroups, message: 'User is already in this group' }
  }

  const updatedGroups = Array.from(new Set([...existingGroups, validatedEmail]))

  await db.user.update({
    where: { id: user.id },
    data: {
      notificationGroupEmails: updatedGroups.join(','),
      isNotificationGroupPending: false,
    },
  })

  // Queue ADD sync job
  await queueNotificationGroupSyncJob(db, {
    userEmail: user.email,
    groupEmail: validatedEmail,
    action: 'ADD',
  })

  return { updated: true, groups: updatedGroups }
}

/**
 * Remove a notification group email from a user and queue a REMOVE job.
 */
export async function removeNotificationGroupFromUser(db: any, userId: string, groupEmailToRemove: string) {
  const targetEmail = normalizeEmail(groupEmailToRemove)

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, notificationGroupEmails: true },
  })

  if (!user) throw new Error('User not found')

  const existingGroups = parseNotificationGroupEmails(user.notificationGroupEmails)
  const updatedGroups = existingGroups.filter(g => g !== targetEmail)

  if (existingGroups.length === updatedGroups.length) {
    return { updated: false, groups: existingGroups, message: 'Group not assigned to user' }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      notificationGroupEmails: updatedGroups.join(','),
    },
  })

  // Queue REMOVE sync job
  await queueNotificationGroupSyncJob(db, {
    userEmail: user.email,
    groupEmail: targetEmail,
    action: 'REMOVE',
  })

  return { updated: true, groups: updatedGroups }
}

/**
 * Get comprehensive pool statistics for manager dashboard visualizer
 */
export async function getNotificationGroupPoolStats(db: any) {
  const pools = await db.notificationGroupPool.findMany({
    orderBy: { createdAt: 'asc' },
  })

  // Recalculate member counts dynamically to ensure 100% accuracy
  const updatedPools = await Promise.all(
    pools.map(async (pool: any) => {
      const actualMemberCount = await db.user.count({
        where: {
          notificationGroupEmails: {
            contains: pool.groupEmail,
          },
        },
      })
      if (actualMemberCount !== pool.currentCount) {
        await db.notificationGroupPool.update({
          where: { id: pool.id },
          data: { currentCount: actualMemberCount },
        })
      }
      return {
        ...pool,
        currentCount: actualMemberCount,
        percentage: Math.min(100, Math.round((actualMemberCount / pool.maxCapacity) * 100)),
        isFull: actualMemberCount >= pool.maxCapacity,
      }
    })
  )

  const pendingOverflowUsers = await db.user.findMany({
    where: { isNotificationGroupPending: true },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  const totalPendingOverflowCount = await db.user.count({
    where: { isNotificationGroupPending: true },
  })

  const totalCapacity = updatedPools.reduce((sum: number, p: any) => sum + (p.isActive ? p.maxCapacity : 0), 0)
  const totalAssigned = updatedPools.reduce((sum: number, p: any) => sum + (p.isActive ? p.currentCount : 0), 0)
  const isAllFull = updatedPools.length === 0 || updatedPools.every((p: any) => !p.isActive || p.isFull)

  return {
    pools: updatedPools,
    totalCapacity,
    totalAssigned,
    pendingOverflowUsers,
    pendingOverflowCount: totalPendingOverflowCount,
    isAllFull,
  }
}

/**
 * Bulk assign all users or unassigned users to notification groups.
 * If groupEmail is provided, it assigns that email to ALL users (preserving existing groups).
 * If no groupEmail is provided, it auto-distributes all unassigned users across available pools.
 */
export async function assignAllUsersToNotificationGroup(db: any, groupEmail?: string) {
  // 1. Specific group assignment to ALL users
  if (groupEmail) {
    const validatedEmail = validateNotificationGroupEmail(groupEmail)
    const targetUsers = await db.user.findMany({
      where: {
        OR: [
          { notificationGroupEmails: null },
          { NOT: { notificationGroupEmails: { contains: validatedEmail } } }
        ]
      },
      select: { id: true, email: true, notificationGroupEmails: true }
    })

    let count = 0
    for (const user of targetUsers) {
      const currentGroups = parseNotificationGroupEmails(user.notificationGroupEmails)
      if (!currentGroups.includes(validatedEmail)) {
        const updatedGroups = Array.from(new Set([...currentGroups, validatedEmail]))
        await db.user.update({
          where: { id: user.id },
          data: {
            notificationGroupEmails: updatedGroups.join(','),
            isNotificationGroupPending: false
          }
        })
        await queueNotificationGroupSyncJob(db, {
          userEmail: user.email,
          groupEmail: validatedEmail,
          action: 'ADD'
        })
        count++
      }
    }

    // Update pool count
    const actualCount = await db.user.count({
      where: { notificationGroupEmails: { contains: validatedEmail } }
    })
    await db.notificationGroupPool.updateMany({
      where: { groupEmail: validatedEmail },
      data: { currentCount: actualCount }
    })

    return { count, message: `Successfully assigned all users to ${validatedEmail}` }
  }

  // 2. Auto-distribute all unassigned users to active pools
  const unassignedUsers = await db.user.findMany({
    where: {
      OR: [
        { notificationGroupEmails: null },
        { notificationGroupEmails: '' }
      ]
    },
    select: { id: true, email: true }
  })

  let count = 0
  for (const user of unassignedUsers) {
    const res = await getOrAssignNotificationGroup(db, user.email)
    if (res.assigned) {
      count++
    }
  }

  return { count, message: `Successfully auto-assigned ${count} unassigned users to available pools` }
}


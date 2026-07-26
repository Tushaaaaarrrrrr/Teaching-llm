export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function parseNotificationGroupEmails(emailsStr?: string | null): string[] {
  if (!emailsStr) return []
  return Array.from(
    new Set(
      emailsStr
        .split(',')
        .map(e => normalizeEmail(e))
        .filter(Boolean)
    )
  )
}

export function validateNotificationGroupEmail(groupEmail: string): string {
  const normalized = normalizeEmail(groupEmail)
  if (!normalized || !normalized.includes('@')) {
    throw new Error(`Invalid group email address: ${groupEmail}`)
  }
  return normalized
}

export async function queueNotificationGroupSyncJob(
  db: any,
  {
    userEmail,
    groupEmail,
    action = 'ADD',
  }: {
    userEmail: string
    groupEmail: string
    action?: 'ADD' | 'REMOVE'
  }
) {
  const normUserEmail = normalizeEmail(userEmail)
  const normGroupEmail = normalizeEmail(groupEmail)

  const existingPendingJob = await db.groupSyncJob.findFirst({
    where: {
      userEmail: normUserEmail,
      groupEmail: normGroupEmail,
      action,
      status: 'PENDING',
    },
  })

  if (existingPendingJob) return existingPendingJob

  return await db.groupSyncJob.create({
    data: {
      userEmail: normUserEmail,
      groupEmail: normGroupEmail,
      action,
      groupType: 'NOTIFICATION',
      status: 'PENDING',
      attemptCount: 0,
    },
  })
}

/**
 * Ensure a default Pool Category exists (e.g. "General Announcements")
 */
export async function ensureDefaultPoolCategory(db: any) {
  let defaultCategory = await db.notificationPoolCategory.findFirst({
    where: { isDefault: true },
  })

  if (!defaultCategory) {
    defaultCategory = await db.notificationPoolCategory.findFirst({
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!defaultCategory) {
    defaultCategory = await db.notificationPoolCategory.create({
      data: {
        name: 'General Announcements',
        description: 'Default pool for system-wide student notifications',
        isDefault: true,
      },
    })
  }

  return defaultCategory
}

/**
 * Create a new Named Pool Category
 */
export async function createPoolCategory(db: any, name: string, description?: string, isDefault = false) {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Pool Category Name is required')

  if (isDefault) {
    await db.notificationPoolCategory.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  return await db.notificationPoolCategory.create({
    data: {
      name: trimmedName,
      description: description ? description.trim() : null,
      isDefault,
    },
  })
}

/**
 * Add a new Google Group email to a specific Pool Category, and immediately flush waiting users
 */
export async function addEmailToPoolCategory(
  db: any,
  categoryId: string,
  groupEmail: string,
  maxCapacity = 500
) {
  const validatedEmail = validateNotificationGroupEmail(groupEmail)

  const category = await db.notificationPoolCategory.findUnique({
    where: { id: categoryId },
  })
  if (!category) throw new Error('Pool Category not found')

  let poolEmail = await db.notificationPoolEmail.findUnique({
    where: { groupEmail: validatedEmail },
  })

  if (poolEmail) {
    poolEmail = await db.notificationPoolEmail.update({
      where: { id: poolEmail.id },
      data: { categoryId: category.id, isActive: true, maxCapacity },
    })
  } else {
    poolEmail = await db.notificationPoolEmail.create({
      data: {
        groupEmail: validatedEmail,
        categoryId: category.id,
        maxCapacity,
        currentCount: 0,
        isActive: true,
      },
    })
  }

  // Immediately flush queue for this category
  const flushResult = await flushCategoryOverflowQueue(db, category.id)

  return { poolEmail, category, flushResult }
}

/**
 * Assign a user to a Pool Category (finding/rolling over to an available child email)
 */
export async function getOrAssignPoolCategory(db: any, userEmail: string, categoryId?: string) {
  const normUserEmail = normalizeEmail(userEmail)

  const targetUser = await db.user.findUnique({
    where: { email: normUserEmail },
    select: { id: true, email: true, notificationGroupEmails: true, pendingPoolCategoryIds: true },
  })

  if (!targetUser) throw new Error(`User not found with email: ${userEmail}`)

  let targetCategory: any
  if (categoryId) {
    targetCategory = await db.notificationPoolCategory.findUnique({
      where: { id: categoryId },
    })
  } else {
    targetCategory = await ensureDefaultPoolCategory(db)
  }

  if (!targetCategory) return { assigned: false, pending: true }

  // Find active email in this category with space
  const poolEmails = await db.notificationPoolEmail.findMany({
    where: { categoryId: targetCategory.id, isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  let availableEmail: any = null
  for (const p of poolEmails) {
    const actualCount = await db.user.count({
      where: { notificationGroupEmails: { contains: p.groupEmail } },
    })
    if (actualCount < p.maxCapacity) {
      availableEmail = p
      break
    }
  }

  // If no email with capacity exists in this category
  if (!availableEmail) {
    const pendingCatIds = parseNotificationGroupEmails(targetUser.pendingPoolCategoryIds)
    if (!pendingCatIds.includes(targetCategory.id)) {
      const updatedPending = Array.from(new Set([...pendingCatIds, targetCategory.id]))
      await db.user.update({
        where: { id: targetUser.id },
        data: {
          isNotificationGroupPending: true,
          pendingPoolCategoryIds: updatedPending.join(','),
        },
      })
    }
    return { assigned: false, pending: true, categoryName: targetCategory.name }
  }

  // Assign user to availableEmail.groupEmail
  const currentGroups = parseNotificationGroupEmails(targetUser.notificationGroupEmails)
  if (!currentGroups.includes(availableEmail.groupEmail)) {
    const updatedGroups = Array.from(new Set([...currentGroups, availableEmail.groupEmail]))

    // Remove category from pending list if present
    const pendingCatIds = parseNotificationGroupEmails(targetUser.pendingPoolCategoryIds).filter(
      id => id !== targetCategory.id
    )

    await db.user.update({
      where: { id: targetUser.id },
      data: {
        notificationGroupEmails: updatedGroups.join(','),
        pendingPoolCategoryIds: pendingCatIds.join(','),
        isNotificationGroupPending: pendingCatIds.length > 0,
      },
    })

    // Update pool email count
    const actualCount = await db.user.count({
      where: { notificationGroupEmails: { contains: availableEmail.groupEmail } },
    })
    await db.notificationPoolEmail.update({
      where: { id: availableEmail.id },
      data: { currentCount: actualCount },
    })

    // Queue Google Sync ADD job
    await queueNotificationGroupSyncJob(db, {
      userEmail: targetUser.email,
      groupEmail: availableEmail.groupEmail,
      action: 'ADD',
    })

    return {
      assigned: true,
      groupEmail: availableEmail.groupEmail,
      categoryName: targetCategory.name,
      newlyAssigned: true,
    }
  }

  return { assigned: true, groupEmail: availableEmail.groupEmail, categoryName: targetCategory.name, newlyAssigned: false }
}

/**
 * Flush category overflow queue
 */
export async function flushCategoryOverflowQueue(db: any, categoryId: string) {
  const pendingUsers = await db.user.findMany({
    where: {
      pendingPoolCategoryIds: { contains: categoryId },
    },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  })

  if (pendingUsers.length === 0) {
    return { totalPending: 0, assigned: 0 }
  }

  let assignedCount = 0
  for (const user of pendingUsers) {
    const res = await getOrAssignPoolCategory(db, user.email, categoryId)
    if (res.assigned && res.newlyAssigned) {
      assignedCount++
    } else if (res.pending) {
      break // filled up again
    }
  }

  return { totalPending: pendingUsers.length, assigned: assignedCount }
}

/**
 * Bulk assign ALL users or unassigned users to a Pool Category
 */
export async function assignAllUsersToPoolCategory(db: any, categoryId?: string) {
  let targetCategory: any
  if (categoryId) {
    targetCategory = await db.notificationPoolCategory.findUnique({
      where: { id: categoryId },
    })
  } else {
    targetCategory = await ensureDefaultPoolCategory(db)
  }

  if (!targetCategory) throw new Error('Pool Category not found')

  const allUsers = await db.user.findMany({
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  })

  let count = 0
  for (const user of allUsers) {
    const res = await getOrAssignPoolCategory(db, user.email, targetCategory.id)
    if (res.assigned && res.newlyAssigned) {
      count++
    }
  }

  return { count, categoryName: targetCategory.name, message: `Processed assignment for ${count} users in ${targetCategory.name}` }
}

/**
 * Comprehensive Stats for Visualizer Dashboard
 */
export async function getPoolCategoryStats(db: any) {
  await ensureDefaultPoolCategory(db)

  const categories = await db.notificationPoolCategory.findMany({
    include: {
      emails: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const updatedCategories = await Promise.all(
    categories.map(async (cat: any) => {
      const updatedEmails = await Promise.all(
        cat.emails.map(async (email: any) => {
          const actualCount = await db.user.count({
            where: { notificationGroupEmails: { contains: email.groupEmail } },
          })
          if (actualCount !== email.currentCount) {
            await db.notificationPoolEmail.update({
              where: { id: email.id },
              data: { currentCount: actualCount },
            })
          }
          return {
            ...email,
            currentCount: actualCount,
            percentage: Math.min(100, Math.round((actualCount / email.maxCapacity) * 100)),
            isFull: actualCount >= email.maxCapacity,
          }
        })
      )

      const catPendingUsersCount = await db.user.count({
        where: { pendingPoolCategoryIds: { contains: cat.id } },
      })

      const totalCap = updatedEmails.reduce((sum: number, e: any) => sum + (e.isActive ? e.maxCapacity : 0), 0)
      const totalAssigned = updatedEmails.reduce((sum: number, e: any) => sum + (e.isActive ? e.currentCount : 0), 0)

      return {
        ...cat,
        emails: updatedEmails,
        totalCapacity: totalCap,
        totalAssigned,
        pendingCount: catPendingUsersCount,
      }
    })
  )

  const totalPendingGlobal = await db.user.count({
    where: { isNotificationGroupPending: true },
  })

  const totalAssignedUsersCount = await db.user.count({
    where: {
      AND: [
        { notificationGroupEmails: { not: null } },
        { NOT: { notificationGroupEmails: '' } },
      ],
    },
  })

  const totalUnassignedUsersCount = await db.user.count({
    where: {
      OR: [
        { notificationGroupEmails: null },
        { notificationGroupEmails: '' },
      ],
    },
  })

  const totalUsersCount = totalAssignedUsersCount + totalUnassignedUsersCount
  const predictedGroupsNeeded = Math.ceil(totalUnassignedUsersCount / 500)

  return {
    categories: updatedCategories,
    totalPendingGlobal,
    totalUsersCount,
    totalAssignedUsersCount,
    totalUnassignedUsersCount,
    predictedGroupsNeeded,
  }
}

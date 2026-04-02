import { SignJWT, importPKCS8 } from 'jose'
import { prisma } from '@/lib/db'

const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token'
const GOOGLE_GROUP_SCOPE = 'https://www.googleapis.com/auth/admin.directory.group.member'
const GROUP_SYNC_MAX_ATTEMPTS = 3
const CRON_SECRET = process.env.CRON_SECRET?.trim() || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || ''

const GOOGLE_WORKSPACE_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim().toLowerCase() || ''
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || ''
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
const GOOGLE_WORKSPACE_ADMIN_EMAIL = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || ''

type SyncAction = 'ADD' | 'REMOVE'
type SyncStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

const STALE_LOCK_LIMIT = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Acquire lock to prevent concurrent processing
 * Returns true if lock was acquired, false if already processing or lock is fresh
 */
async function acquireSyncLock(): Promise<boolean> {
  try {
    const now = new Date()
    const staleThreshold = new Date(now.getTime() - STALE_LOCK_LIMIT)

    // Atomic update: only take the lock if it's free OR if it's been stuck for > 5 mins
    const lock = await (prisma as any).groupSyncLock.updateMany({
      where: {
        id: 'singleton',
        OR: [
          { isProcessing: false },
          { lockedAt: { lt: staleThreshold } }
        ]
      },
      data: {
        isProcessing: true,
        lockedAt: now,
      }
    })

    // updateMany returns { count: number }
    return lock.count > 0
  } catch (error) {
    console.error('[Google Group Sync] Failed to acquire lock:', error)
    return false
  }
}

/**
 * Release lock after processing
 */
async function releaseSyncLock(): Promise<void> {
  try {
    await (prisma as any).groupSyncLock.update({
      where: { id: 'singleton' },
      data: {
        isProcessing: false,
        lockedAt: null,
      },
    })
  } catch (error) {
    console.error('[Google Group Sync] Failed to release lock:', error)
  }
}

/**
 * Check if processing is already in progress (and not stale)
 */
async function isProcessing(): Promise<boolean> {
  try {
    const staleThreshold = new Date(Date.now() - STALE_LOCK_LIMIT)
    const lock = await (prisma as any).groupSyncLock.findUnique({
      where: { id: 'singleton' },
    })

    if (!lock) return false
    
    // It's effectively processing only if the flag is true AND it hasn't timed out
    return lock.isProcessing && lock.lockedAt && lock.lockedAt > staleThreshold
  } catch (error) {
    return false
  }
}


export function validateGoogleGroupEmail(rawEmail?: string | null) {
  if (!rawEmail || !rawEmail.trim()) return null

  const email = normalizeEmail(rawEmail)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) {
    throw new Error('Google Group Email must be a valid email address')
  }

  if (GOOGLE_WORKSPACE_DOMAIN && !email.endsWith(`@${GOOGLE_WORKSPACE_DOMAIN}`)) {
    throw new Error(`Google Group Email must belong to @${GOOGLE_WORKSPACE_DOMAIN}`)
  }

  return email
}

export async function queueGoogleGroupSyncJobs(
  db: any,
  {
    userEmail,
    courseIds,
    action,
  }: {
    userEmail: string
    courseIds: string[]
    action: SyncAction
  }
) {
  const normalizedUserEmail = normalizeEmail(userEmail)
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)))
  if (!normalizedUserEmail || uniqueCourseIds.length === 0) return 0

  const courses = await db.course.findMany({
    where: {
      id: { in: uniqueCourseIds },
      googleGroupEmail: { not: null },
    },
    select: {
      id: true,
      googleGroupEmail: true,
    },
  })

  if (courses.length === 0) return 0

  const pendingJobs = await db.groupSyncJob.findMany({
    where: {
      userEmail: normalizedUserEmail,
      courseId: { in: courses.map((course: { id: string }) => course.id) },
      action,
      status: 'PENDING',
    },
    select: {
      courseId: true,
      groupEmail: true,
    },
  })

  const pendingKeys = new Set(
    pendingJobs.map((job: { courseId: string; groupEmail: string }) => `${job.courseId}:${job.groupEmail}`)
  )

  const jobsToCreate = courses
    .map((course: { id: string; googleGroupEmail: string | null }) => ({
      userEmail: normalizedUserEmail,
      courseId: course.id,
      groupEmail: normalizeEmail(course.googleGroupEmail || ''),
      action,
      status: 'PENDING' as SyncStatus,
    }))
    .filter(job => job.groupEmail && !pendingKeys.has(`${job.courseId}:${job.groupEmail}`))

  if (jobsToCreate.length === 0) return 0

  await db.groupSyncJob.createMany({ data: jobsToCreate })
  
  // Trigger background processing with a short delay to batch multiple enrollments
  triggerGoogleGroupSyncDebounced()

  return jobsToCreate.length
}

export async function queueExplicitGoogleGroupSyncJobs(
  db: any,
  jobs: Array<{
    userEmail: string
    courseId: string
    groupEmail: string
    action: SyncAction
  }>
) {
  if (jobs.length === 0) return 0

  const normalizedJobs = jobs
    .map(job => ({
      userEmail: normalizeEmail(job.userEmail),
      courseId: job.courseId,
      groupEmail: normalizeEmail(job.groupEmail),
      action: job.action,
      status: 'PENDING' as SyncStatus,
    }))
    .filter(job => job.userEmail && job.courseId && job.groupEmail)

  if (normalizedJobs.length === 0) return 0

  const pendingJobs = await db.groupSyncJob.findMany({
    where: {
      status: 'PENDING',
      OR: normalizedJobs.map(job => ({
        userEmail: job.userEmail,
        courseId: job.courseId,
        groupEmail: job.groupEmail,
        action: job.action,
      })),
    },
    select: {
      userEmail: true,
      courseId: true,
      groupEmail: true,
      action: true,
    },
  })

  const pendingKeys = new Set(
    pendingJobs.map((job: any) =>
      `${job.userEmail}:${job.courseId}:${job.groupEmail}:${job.action}`
    )
  )

  const filteredJobs = normalizedJobs.filter(job =>
    !pendingKeys.has(`${job.userEmail}:${job.courseId}:${job.groupEmail}:${job.action}`)
  )

  if (filteredJobs.length === 0) return 0

  await db.groupSyncJob.createMany({ data: filteredJobs })
  
  // Trigger background processing with a short delay to batch multiple enrollments
  triggerGoogleGroupSyncDebounced()

  return filteredJobs.length
}

let syncDebounceTimer: NodeJS.Timeout | null = null
const TRIGGER_DEBOUNCE_MS = 15000 // 15 seconds

/**
 * Throttled trigger to prevent database connection spikes 
 * during concurrent enrollments.
 */
export function triggerGoogleGroupSyncDebounced() {
  // If a sync is already scheduled, do nothing (batch it)
  if (syncDebounceTimer) return

  syncDebounceTimer = setTimeout(async () => {
    try {
      await processGoogleGroupSyncJobs()
    } catch (error) {
      console.error('[Google Group Sync] Debounced processing failed:', error)
    } finally {
      syncDebounceTimer = null
    }
  }, TRIGGER_DEBOUNCE_MS)
}

async function getGoogleAccessToken() {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || !GOOGLE_WORKSPACE_ADMIN_EMAIL) {
    throw new Error('Google Group sync credentials are not fully configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const key = await importPKCS8(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, 'RS256')
  const assertion = await new SignJWT({ scope: GOOGLE_GROUP_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(GOOGLE_SERVICE_ACCOUNT_EMAIL)
    .setSubject(GOOGLE_WORKSPACE_ADMIN_EMAIL)
    .setAudience(GOOGLE_TOKEN_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const data = await response.json()
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to obtain Google access token')
  }

  return data.access_token as string
}

async function addMemberToGroup(accessToken: string, userEmail: string, groupEmail: string) {
  const response = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userEmail,
      role: 'MEMBER',
    }),
  })

  if (response.ok || response.status === 409) {
    return
  }

  const data = await response.json().catch(() => null)
  throw new Error(data?.error?.message || `Google add member failed with status ${response.status}`)
}

async function removeMemberFromGroup(accessToken: string, userEmail: string, groupEmail: string) {
  const response = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members/${encodeURIComponent(userEmail)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.ok || response.status === 404) {
    return
  }

  const data = await response.json().catch(() => null)
  throw new Error(data?.error?.message || `Google remove member failed with status ${response.status}`)
}

export async function processGoogleGroupSyncJobs() {
  // Check if already processing to prevent concurrent execution
  if (await isProcessing()) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: true }
  }

  // Acquire lock
  const lockAcquired = await acquireSyncLock()
  if (!lockAcquired) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: true }
  }

  try {
    const jobs = await (prisma as any).groupSyncJob.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        attemptCount: { lt: GROUP_SYNC_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'asc' },
      take: 10, // Process max 10 jobs per run for server health
    })

    if (jobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 }
    }

    // Bulk mark as PROCESSING to save database round-trips
    await (prisma as any).groupSyncJob.updateMany({
      where: { id: { in: jobs.map((j: { id: string }) => j.id) } },
      data: { status: 'PROCESSING' }
    })

    const accessToken = await getGoogleAccessToken()
    let succeeded = 0
    let failed = 0

    for (const job of jobs) {
      try {
        // Pacing: 500ms breather between Google API calls to keep CPU low
        await new Promise(resolve => setTimeout(resolve, 500))

        // Execute the sync operation
        if (job.action === 'ADD') {
          await addMemberToGroup(accessToken, job.userEmail, job.groupEmail)
        } else {
          await removeMemberFromGroup(accessToken, job.userEmail, job.groupEmail)
        }

        // Mark as SUCCESS and increment attempt count
        await (prisma as any).groupSyncJob.update({
          where: { id: job.id },
          data: {
            status: 'SUCCESS',
            attemptCount: job.attemptCount + 1,
            lastError: null,
          },
        })
        succeeded++
      } catch (error) {
        console.error('[Google Group Sync] Job failed', {
          jobId: job.id,
          action: job.action,
          userEmail: job.userEmail,
          groupEmail: job.groupEmail,
          error: error instanceof Error ? error.message : 'Unknown Google sync error',
        })
        const nextAttemptCount = job.attemptCount + 1
        await (prisma as any).groupSyncJob.update({
          where: { id: job.id },
          data: {
            status: nextAttemptCount >= GROUP_SYNC_MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
            attemptCount: nextAttemptCount,
            lastError: error instanceof Error ? error.message : 'Unknown Google sync error',
          },
        })
        failed++
      }
    }

    return { processed: jobs.length, succeeded, failed }
  } finally {
    // Always release lock, even on error
    await releaseSyncLock()
  }
}

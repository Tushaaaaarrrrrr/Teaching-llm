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

/**
 * Acquire lock to prevent concurrent processing
 * Returns true if lock was acquired, false if already processing
 */
async function acquireSyncLock(): Promise<boolean> {
  try {
    const result = await (prisma as any).groupSyncLock.update({
      where: { id: 'singleton' },
      data: {
        isProcessing: true,
        lockedAt: new Date(),
      },
    })
    return true
  } catch (error) {
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
 * Check if processing is already in progress
 */
async function isProcessing(): Promise<boolean> {
  try {
    const lock = await (prisma as any).groupSyncLock.findUnique({
      where: { id: 'singleton' },
    })
    
    if (!lock || !lock.isProcessing) {
      return false
    }

    // Check for stale lock (older than 60 seconds)
    if (lock.lockedAt) {
      const lockAgeSeconds = (new Date().getTime() - new Date(lock.lockedAt).getTime()) / 1000
      if (lockAgeSeconds > 60) {
        console.warn('[Google Group Sync] Stale lock detected (older than 60s), auto-resetting')
        return false 
      }
    }

    return true
  } catch (error) {
    return false
  }
}

let pendingTrigger: NodeJS.Timeout | null = null

/**
 * Trigger async processing of Google Group sync jobs.
 * Uses a 10-second buffer on the FIRST call to batch multiple incoming jobs.
 * After each successful batch, automatically re-triggers with a 2-second delay
 * if there are still PENDING jobs remaining (chain processing until queue empty).
 */
export function triggerGoogleGroupSyncProcessing(isChained = false): void {
  // If a trigger is already scheduled, don't create another one
  if (pendingTrigger) return

  // Use a short 2s delay when chaining (queue already filled), 10s for initial batching
  const delay = isChained ? 2000 : 10000

  pendingTrigger = setTimeout(async () => {
    pendingTrigger = null // Clear so new triggers can be scheduled

    try {
      const result = await processGoogleGroupSyncJobs()
      if (result.processed > 0) {
        console.log(`[Google Group Sync] Batch done — ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed${
          result.hasMore ? ' — more pending, continuing...' : ' — queue clear'
        }`)
      }

      // If there are still jobs in the queue, chain the next run automatically
      if (result.hasMore) {
        triggerGoogleGroupSyncProcessing(true)
      }
    } catch (error) {
      console.error('[Google Group Sync] Direct processing failed:', error instanceof Error ? error.message : String(error))
    }
  }, delay)
}

export function validateGoogleGroupEmail(rawEmail?: string | null) {
  if (!rawEmail || !rawEmail.trim()) return null

  // Support comma-separated multiple emails (max 5)
  const rawEmails = rawEmail.split(',').map(e => e.trim()).filter(e => e)
  if (rawEmails.length === 0) return null
  if (rawEmails.length > 5) {
    throw new Error('Maximum 5 Google Group Emails allowed per course')
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validated: string[] = []

  for (const raw of rawEmails) {
    const email = normalizeEmail(raw)
    if (!emailPattern.test(email)) {
      throw new Error(`Google Group Email "${raw}" is not a valid email address`)
    }
    if (GOOGLE_WORKSPACE_DOMAIN && !email.endsWith(`@${GOOGLE_WORKSPACE_DOMAIN}`)) {
      throw new Error(`Google Group Email "${raw}" must belong to @${GOOGLE_WORKSPACE_DOMAIN}`)
    }
    validated.push(email)
  }

  // Deduplicate
  const unique = validated.filter((value, index, self) => self.indexOf(value) === index)
  return unique.join(',')
}

/**
 * Parse a comma-separated googleGroupEmail string into an array of individual emails.
 */
export function parseGoogleGroupEmails(googleGroupEmail: string | null | undefined): string[] {
  if (!googleGroupEmail) return []
  return googleGroupEmail.split(',').map(e => e.trim()).filter(e => e)
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

  const jobs = courses
    .flatMap((course: { id: string; googleGroupEmail: string | null }) => {
      const groupEmails = parseGoogleGroupEmails(course.googleGroupEmail)
      return groupEmails.map(groupEmail => ({
        userEmail: normalizedUserEmail,
        courseId: course.id,
        groupEmail: normalizeEmail(groupEmail),
        action,
        status: 'PENDING' as SyncStatus,
      }))
    })
    .filter(job => job.groupEmail && !pendingKeys.has(`${job.courseId}:${job.groupEmail}`))

  if (jobs.length === 0) return 0

  await db.groupSyncJob.createMany({ data: jobs })

  // Trigger async processing (fire-and-forget, outside transaction)
  // Schedule in next tick to avoid blocking the transaction
  process.nextTick(() => triggerGoogleGroupSyncProcessing())

  return jobs.length
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
    pendingJobs.map((job: { userEmail: string; courseId: string; groupEmail: string; action: SyncAction }) =>
      `${job.userEmail}:${job.courseId}:${job.groupEmail}:${job.action}`
    )
  )

  const filteredJobs = normalizedJobs.filter(job =>
    !pendingKeys.has(`${job.userEmail}:${job.courseId}:${job.groupEmail}:${job.action}`)
  )

  if (filteredJobs.length === 0) return 0

  await db.groupSyncJob.createMany({ data: filteredJobs })

  // Trigger async processing (fire-and-forget, outside transaction)
  process.nextTick(() => triggerGoogleGroupSyncProcessing())

  return filteredJobs.length
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

export async function retryFailedGoogleGroupSyncJobs() {
  const result = await (prisma as any).groupSyncJob.updateMany({
    where: {
      status: 'FAILED',
    },
    data: {
      status: 'PENDING',
      attemptCount: 0,
      lastError: null,
    },
  })

  // Trigger async processing immediately
  process.nextTick(() => triggerGoogleGroupSyncProcessing())

  return { resetCount: result.count }
}

export async function processGoogleGroupSyncJobs(force = false) {
  // Check if already processing to prevent concurrent execution unless forced
  if (force) {
    await releaseSyncLock()
  } else if (await isProcessing()) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: true }
  }

  // Acquire lock
  const lockAcquired = await acquireSyncLock()
  if (!lockAcquired) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: true }
  }

  try {
    // 1. Initial count of pending jobs
    const remainingCount = await (prisma as any).groupSyncJob.count({
      where: {
        status: 'PENDING',
        attemptCount: { lt: GROUP_SYNC_MAX_ATTEMPTS },
      },
    })

    if (remainingCount === 0) {
      return { processed: 0, succeeded: 0, failed: 0 }
    }

    // 2. Safe Batch Size & Rate-Compliant Concurrency
    // Google Workspace Directory API rate limits allow ~1-2 operations/sec per service account.
    // We use a max concurrency of 2 with a 250ms inter-chunk delay.
    const batchSize = Math.min(50, remainingCount)
    const concurrency = 2

    console.log(`[Google Group Sync] Processing batch: ${remainingCount} users pending, pulling next ${batchSize}`)

    const jobs = await (prisma as any).groupSyncJob.findMany({
      where: {
        status: 'PENDING',
        attemptCount: { lt: GROUP_SYNC_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    })

    const accessToken = await getGoogleAccessToken()
    let succeeded = 0
    let failed = 0

    // 3. Serialized Chunk Processing with Delays to Respect Google Rate Limits
    for (let i = 0; i < jobs.length; i += concurrency) {
      if (i > 0) {
        // 250ms delay between request pairs to comply with Google rate limit thresholds
        await new Promise(resolve => setTimeout(resolve, 250))
      }

      const chunk = jobs.slice(i, i + concurrency)
      
      await Promise.allSettled(chunk.map(async (job: any) => {
        try {
          // Mark as PROCESSING
          await (prisma as any).groupSyncJob.update({
            where: { id: job.id },
            data: {
              status: 'PROCESSING',
            },
          })

          // Execute the sync operation
          if (job.action === 'ADD') {
            await addMemberToGroup(accessToken, job.userEmail, job.groupEmail)
          } else {
            await removeMemberFromGroup(accessToken, job.userEmail, job.groupEmail)
          }

          // Mark as SUCCESS
          await (prisma as any).groupSyncJob.update({
            where: { id: job.id },
            data: {
              status: 'SUCCESS',
              lastError: null,
            },
          })
          succeeded++
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error)
          const isRateLimit = errMsg.toLowerCase().includes('request rate higher than configured') ||
                              errMsg.toLowerCase().includes('ratelimitexceeded') ||
                              errMsg.toLowerCase().includes('quota')

          console.error(`[Google Group Sync] Job ${job.id} failed (${isRateLimit ? 'RATE LIMITED' : 'ERROR'}):`, errMsg)

          if (isRateLimit) {
            // Do NOT increment attempt count on rate limit! Keep status PENDING so it can be safely retried.
            await (prisma as any).groupSyncJob.update({
              where: { id: job.id },
              data: {
                status: 'PENDING',
                lastError: 'Request rate higher than configured (Rate Limited - Will Auto Retry)',
              },
            })
            // Pause execution briefly (3s) to allow Google API quota window to reset
            await new Promise(resolve => setTimeout(resolve, 3000))
          } else {
            const nextAttemptCount = job.attemptCount + 1
            await (prisma as any).groupSyncJob.update({
              where: { id: job.id },
              data: {
                attemptCount: nextAttemptCount,
                status: nextAttemptCount >= GROUP_SYNC_MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
                lastError: errMsg || 'Unknown Google sync error',
              },
            })
            failed++
          }
        }
      }))
    }

    // 4. Automatic Cleanup
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      await (prisma as any).groupSyncJob.deleteMany({
        where: {
          status: 'SUCCESS',
          createdAt: { lt: thirtyDaysAgo },
        },
      })
    } catch (cleanupError) {
      console.error('[Google Group Sync] Cleanup failed:', cleanupError)
    }

    // 5. Final check for more jobs
    const finalCount = await (prisma as any).groupSyncJob.count({
      where: {
        status: 'PENDING',
        attemptCount: { lt: GROUP_SYNC_MAX_ATTEMPTS },
      },
    })

    return { processed: jobs.length, succeeded, failed, hasMore: finalCount > 0 }
  } finally {
    // Always release lock
    await releaseSyncLock()
  }
}

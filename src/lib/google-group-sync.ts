import { SignJWT, importPKCS8 } from 'jose'
import { prisma } from '@/lib/db'

const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token'
const GOOGLE_GROUP_SCOPE = 'https://www.googleapis.com/auth/admin.directory.group.member'
const GROUP_SYNC_MAX_ATTEMPTS = 3

const GOOGLE_WORKSPACE_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim().toLowerCase() || ''
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || ''
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
const GOOGLE_WORKSPACE_ADMIN_EMAIL = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || ''

type SyncAction = 'ADD' | 'REMOVE'
type SyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
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

  const jobs = courses
    .map((course: { id: string; googleGroupEmail: string | null }) => ({
      userEmail: normalizedUserEmail,
      courseId: course.id,
      groupEmail: normalizeEmail(course.googleGroupEmail || ''),
      action,
      status: 'PENDING' as SyncStatus,
    }))
    .filter(job => job.groupEmail && !pendingKeys.has(`${job.courseId}:${job.groupEmail}`))

  if (jobs.length === 0) return 0

  await db.groupSyncJob.createMany({ data: jobs })
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

export async function processGoogleGroupSyncJobs() {
  const jobs = await (prisma as any).groupSyncJob.findMany({
    where: {
      status: 'PENDING',
      attemptCount: { lt: GROUP_SYNC_MAX_ATTEMPTS },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  if (jobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  const accessToken = await getGoogleAccessToken()
  let succeeded = 0
  let failed = 0

  for (const job of jobs) {
    try {
      if (job.action === 'ADD') {
        await addMemberToGroup(accessToken, job.userEmail, job.groupEmail)
      } else {
        await removeMemberFromGroup(accessToken, job.userEmail, job.groupEmail)
      }

      await (prisma as any).groupSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'SUCCESS',
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
          attemptCount: nextAttemptCount,
          status: nextAttemptCount >= GROUP_SYNC_MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          lastError: error instanceof Error ? error.message : 'Unknown Google sync error',
        },
      })
      failed++
    }
  }

  return { processed: jobs.length, succeeded, failed }
}

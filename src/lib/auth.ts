import jwt from 'jsonwebtoken'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { isCourseEffectivelyDisabled } from '@/lib/course-state'

const COOKIE_NAME = 'teaching_llm_token'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 32')
  }
  return secret
}

export interface JWTPayload {
  userId: string
  email: string
  role: 'MANAGER' | 'ADMIN' | 'STUDENT' | 'INSTRUCTOR'
  name: string
  canTerminate?: boolean
  canCreateStudents?: boolean
  tokenVersion?: number // Added for token rotation/invalidation
}

/**
 * Full user session fetched in a SINGLE DB query.
 * Includes termination status + accessible course IDs.
 */
export interface FullSession extends JWTPayload {
  isTerminated: boolean
  isProfileComplete: boolean
  enableDetailedLogs: boolean
  hasSeenWelcome: boolean
  accessibleCourseIds: string[] | null // null = all courses (MANAGER)
  enrollmentTypes: Record<string, string> // courseId → 'LIVE' | 'RECORDED'
  isMaintenanceMode?: boolean
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload
  } catch (err) {
    // Silently handle expired/invalid tokens for getSession
    return null
  }
}

export interface StreamTokenPayload {
  userId: string
  lectureId: string
  role: string
}

export function signStreamToken(userId: string, lectureId: string, role: string): string {
  return jwt.sign({ userId, lectureId, role }, getJwtSecret(), { expiresIn: '4h' })
}

export function verifyStreamToken(token: string): StreamTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as StreamTokenPayload
  } catch (err) {
    return null
  }
}



/**
 * Extracts the session token from the request cookies or Authorization header.
 * Pure function — no DB calls, no side effects.
 */
async function getTokenFromRequest(): Promise<string | undefined> {
  let token: string | undefined = undefined

  // 1. Try to get token from cookies
  try {
    const cookieStore = await cookies()
    token = cookieStore.get(COOKIE_NAME)?.value
  } catch (e) {
    // In some environments, cookies() might throw if called outside request context
  }

  // 2. Try to get token from Authorization header
  if (!token) {
    try {
      const headerStore = await headers()
      const authHeader = headerStore.get('Authorization') || headerStore.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    } catch (e) {
      // headers() might throw if called outside request context
    }
  }

  return token
}

export async function getSession(): Promise<JWTPayload | null> {
  try {
    const token = await getTokenFromRequest()
    if (!token) return null
    
    const payload = verifyToken(token)
    if (!payload) return null

    // Security: Verify token version and termination status from DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isTerminated: true, tokenVersion: true },
    })

    if (!user || user.isTerminated) return null

    // Token version mismatch = token was invalidated (password change, forced logout, etc.)
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Combined auth: decodes JWT + fetches user (isTerminated, enrollments, settings)
 * in ONE DB call (+ settings in parallel). Skips the redundant getSession() DB
 * lookup — directly verifies JWT, then fetches everything needed in a single query.
 */
export async function getFullSession(): Promise<FullSession | null> {
  try {
    // Step 1: Extract and verify JWT (NO database call)
    const token = await getTokenFromRequest()
    if (!token) return null

    const jwtPayload = verifyToken(token)
    if (!jwtPayload) return null

    // Step 2: Fetch user + settings in PARALLEL — ONE user query covers
    // tokenVersion, isTerminated, enrollments, and profile state. This replaces
    // the old flow where getSession() did a separate findUnique for just
    // tokenVersion + isTerminated, followed by another findUnique here.
    const now = new Date()
    let user: any = null
    let settings: any = null

    try {
      [user, settings] = await Promise.all([
        (prisma.user.findUnique as any)({
          where: { id: jwtPayload.userId },
          select: {
            role: true,
            isTerminated: true,
            tokenVersion: true,
            isProfileComplete: true,
            enableDetailedLogs: true,
            hasSeenWelcome: true,
            enrollments: (jwtPayload.role !== 'MANAGER') ? {
              where: {
                course: {
                  isDisabled: false,
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) } },
                    ],
                },
              },
              select: { courseId: true, type: true },
            } : false,
          },
        }),
        prisma.updateSystemSettings.findUnique({
          where: { id: 'singleton' }
        }).catch((error: any) => {
          console.error('\n[AUTH WARNING] UpdateSystemSettings lookup failed in getFullSession, defaulting to false.')
          console.error('Raw Error:', error?.message || error)
          return null
        }),
      ])
    } catch (error: any) {
      console.error('\n[AUTH CRITICAL ERROR] User database lookup failed in getFullSession!')
      console.error('This typically indicates the current production DB schema is missing tables or columns defined in code (e.g., Enrollment.type from previous migrations).')
      console.error('Raw Error:', error?.message || error)
      return null
    }

    // Security Check: Token Version Invalidation
    // If user has a tokenVersion in JWT, it MUST match the DB.
    // Exception: If JWT is missing it (backward compatibility), allow it but next login will fix it.
    if (!user || user.isTerminated) return null
    
    if (jwtPayload.tokenVersion !== undefined && jwtPayload.tokenVersion !== user.tokenVersion) {
      return null
    }

    const enrollments = (user.enrollments as { courseId: string; type: string }[] | undefined) ?? []
    const userRole = user.role || jwtPayload.role

    return {
      ...jwtPayload,
      role: userRole,
      isTerminated: user.isTerminated,
      isProfileComplete: user.isProfileComplete,
      enableDetailedLogs: user.enableDetailedLogs || false,
      hasSeenWelcome: user.hasSeenWelcome || false,
      accessibleCourseIds: (userRole === 'MANAGER') 
        ? null 
        : enrollments.map(e => e.courseId),
      enrollmentTypes: (userRole === 'MANAGER')
        ? {}
        : Object.fromEntries(enrollments.map(e => [e.courseId, e.type])),
      isMaintenanceMode: settings?.maintenanceMode && (userRole !== 'MANAGER')
    }
  } catch {
    return null
  }
}

export function getCookieConfig() {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days — matches JWT expiry
      path: '/',
    },
  }
}

export function isManager(role: string) {
  return role === 'MANAGER'
}

export function isSuperAdmin(role: string) {
  return false
}

export function isManagerOrSuperAdmin(role: string) {
  return role === 'MANAGER'
}

export function isAdminOrManager(role: string) {
  return role === 'MANAGER' || role === 'ADMIN'
}

export function canCreateAnnouncements(role: string) {
  return role === 'MANAGER'
}

export function canManageContent(role: string) {
  return role === 'MANAGER'
}

export function canManageEvents(role: string) {
  return role === 'MANAGER'
}

/**
 * Returns the courseIds the user has access to via Enrollment.
 * MANAGER: returns null (meaning "all courses, no filtering")
 * ADMIN/STUDENT: returns string[] of enrolled courseIds (may be empty)
 */
export async function getAccessibleCourseIds(
  userId: string,
  role: string
): Promise<string[] | null> {
  if (role === 'MANAGER') return null

  const now = new Date()

  if (role === 'INSTRUCTOR') {
    const assignments = await (prisma.instructorAssignment.findMany as any)({
      where: { instructorId: userId },
      select: {
        courseId: true,
        course: {
          select: {
            isDisabled: true,
            expiresAt: true,
          },
        },
      },
    })
    return assignments
      .filter(a => !isCourseEffectivelyDisabled(a.course, now))
      .map(a => a.courseId)
  }

  const enrollments = await (prisma.enrollment.findMany as any)({
    where: { 
      userId,
      course: {
        isDisabled: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) } }
        ]
      }
    },
    select: { courseId: true },
  })

  return enrollments.map(e => e.courseId)
}

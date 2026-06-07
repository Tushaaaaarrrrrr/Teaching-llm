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
  role: 'MANAGER' | 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT' | 'INSTRUCTOR'
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



export async function getSession(): Promise<JWTPayload | null> {
  try {
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
 * Combined auth: decodes JWT + fetches user (isTerminated, enrollments) in ONE DB call.
 * Eliminates the need for separate getSession() + getAccessibleCourseIds() + isTerminated check.
 */
export async function getFullSession(): Promise<FullSession | null> {
  const jwtPayload = await getSession()
  if (!jwtPayload) return null

  // Fetch isTerminated, enrollments AND current tokenVersion in ONE query
  const now = new Date()
  let user: any = null;
  let settings: any = null;

  try {
    user = await (prisma.user.findUnique as any)({
      where: { id: jwtPayload.userId },
      select: {
        isTerminated: true,
        tokenVersion: true,
        isProfileComplete: true,
        enableDetailedLogs: true,
        enrollments: (jwtPayload.role !== 'MANAGER' && jwtPayload.role !== 'SUPER_ADMIN') ? {
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
    })
  } catch (error: any) {
    console.error('\n[AUTH CRITICAL ERROR] User database lookup failed in getFullSession!')
    console.error('This typically indicates the current production DB schema is missing tables or columns defined in code (e.g., Enrollment.type from previous migrations).')
    console.error('Raw Error:', error?.message || error)
    return null
  }

  try {
    settings = await prisma.updateSystemSettings.findUnique({
      where: { id: 'singleton' }
    })
  } catch (error: any) {
    console.error('\n[AUTH WARNING] UpdateSystemSettings lookup failed in getFullSession, defaulting to false.')
    console.error('Raw Error:', error?.message || error)
    settings = null
  }

  // Security Check: Token Version Invalidation
  // If user has a tokenVersion in JWT, it MUST match the DB.
  // Exception: If JWT is missing it (backward compatibility), allow it but next login will fix it.
  if (!user || user.isTerminated) return null
  
  if (jwtPayload.tokenVersion !== undefined && jwtPayload.tokenVersion !== user.tokenVersion) {
    return null
  }

  const enrollments = (user.enrollments as { courseId: string; type: string }[] | undefined) ?? []

  return {
    ...jwtPayload,
    isTerminated: user.isTerminated,
    isProfileComplete: user.isProfileComplete,
    enableDetailedLogs: user.enableDetailedLogs || false,
    accessibleCourseIds: (jwtPayload.role === 'MANAGER' || jwtPayload.role === 'SUPER_ADMIN') 
      ? null 
      : enrollments.map(e => e.courseId),
    enrollmentTypes: (jwtPayload.role === 'MANAGER' || jwtPayload.role === 'SUPER_ADMIN')
      ? {}
      : Object.fromEntries(enrollments.map(e => [e.courseId, e.type])),
    isMaintenanceMode: settings?.maintenanceMode && (jwtPayload.role !== 'MANAGER' && jwtPayload.role !== 'SUPER_ADMIN')
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
  return role === 'SUPER_ADMIN'
}

export function isManagerOrSuperAdmin(role: string) {
  return role === 'MANAGER' || role === 'SUPER_ADMIN'
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
  if (role === 'MANAGER' || role === 'SUPER_ADMIN') return null

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

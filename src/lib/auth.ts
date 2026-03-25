import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

const JWT_SECRET = (process.env.JWT_SECRET || 'teaching-llm-super-secret-jwt-key-2024').trim()

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required.')
}
const COOKIE_NAME = 'teaching_llm_token'

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
  accessibleCourseIds: string[] | null // null = all courses (MANAGER)
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as JWTPayload
  } catch (err) {
    // Silently handle expired/invalid tokens for getSession
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    return verifyToken(token)
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
  const user = await (prisma.user.findUnique as any)({
    where: { id: jwtPayload.userId },
    select: {
      isTerminated: true,
      tokenVersion: true,
      enrollments: jwtPayload.role !== 'MANAGER' ? {
        where: {
          course: {
            isDisabled: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        },
        select: { courseId: true },
      } : false,
    },
  })

  // Security Check: Token Version Invalidation
  // If user has a tokenVersion in JWT, it MUST match the DB.
  // Exception: If JWT is missing it (backward compatibility), allow it but next login will fix it.
  if (!user || user.isTerminated) return null
  
  if (jwtPayload.tokenVersion !== undefined && jwtPayload.tokenVersion !== user.tokenVersion) {
    return null
  }

  return {
    ...jwtPayload,
    isTerminated: user.isTerminated,
    accessibleCourseIds: jwtPayload.role === 'MANAGER' 
      ? null 
      : (user.enrollments as { courseId: string }[] | undefined)?.map(e => e.courseId) ?? [],
  }
}

export function getCookieConfig() {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    },
  }
}

export function isManager(role: string) {
  return role === 'MANAGER'
}

export function isAdminOrManager(role: string) {
  return role === 'MANAGER' || role === 'ADMIN'
}

export function canCreateAnnouncements(role: string) {
  return role === 'MANAGER'
}

export function canManageContent(role: string) {
  return role === 'MANAGER' || role === 'ADMIN'
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
      where: { instructorId: userId, course: { isDisabled: false } },
      select: { courseId: true },
    })
    return assignments.map(a => a.courseId)
  }

  const enrollments = await (prisma.enrollment.findMany as any)({
    where: { 
      userId,
      course: {
        isDisabled: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    },
    select: { courseId: true },
  })

  return enrollments.map(e => e.courseId)
}

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'teaching-llm-secret-key-change-in-production'
const COOKIE_NAME = 'teaching_llm_token'

export interface JWTPayload {
  userId: string
  email: string
  role: 'MANAGER' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  name: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
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

export function isInstructor(role: string) {
  return role === 'INSTRUCTOR'
}

/** Returns true for any role that can manage content (MANAGER, ADMIN, INSTRUCTOR) */
export function canManageContent(role: string) {
  return role === 'MANAGER' || role === 'ADMIN' || role === 'INSTRUCTOR'
}

/**
 * Returns the classIds the instructor is assigned to via InstructorAssignment.
 */
export async function getInstructorClassIds(userId: string): Promise<string[]> {
  const assignments = await prisma.instructorAssignment.findMany({
    where: { instructorId: userId },
    select: { classId: true },
  })
  return assignments.map(a => a.classId)
}

/**
 * Returns the classIds the user has access to via Enrollment.
 * MANAGER: returns null (meaning "all classes, no filtering")
 * ADMIN/STUDENT: returns string[] of enrolled classIds (may be empty)
 */
export async function getAccessibleClassIds(
  userId: string,
  role: string
): Promise<string[] | null> {
  if (role === 'MANAGER') return null

  // INSTRUCTOR: return assigned classIds
  if (role === 'INSTRUCTOR') {
    const assignments = await prisma.instructorAssignment.findMany({
      where: { instructorId: userId },
      select: { classId: true },
    })
    return assignments.map(a => a.classId)
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { classId: true },
  })

  return enrollments.map(e => e.classId)
}

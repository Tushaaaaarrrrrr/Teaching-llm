import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/db'

const COOKIE_NAME = 'teaching_llm_token'

export async function GET() {
  // Step 1: Extract JWT token (same logic as getTokenFromRequest in auth.ts)
  let token: string | undefined = undefined

  try {
    const cookieStore = await cookies()
    token = cookieStore.get(COOKIE_NAME)?.value
  } catch (e) {}

  if (!token) {
    try {
      const headerStore = await headers()
      const authHeader = headerStore.get('Authorization') || headerStore.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    } catch (e) {}
  }

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Step 2: Verify JWT (no DB call)
  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Step 3: SINGLE DB query — covers auth checks + all user fields
  const user = await (prisma.user as any).findUnique({
    where: { id: payload.userId },
    select: {
      id: true, name: true, email: true, role: true, avatar: true, gender: true, createdAt: true,
      mobileNumber: true, isProfileComplete: true,
      appTourCompleted: true, appTourCompletedAt: true, completedTourVersion: true,
      isIdentityUpdated: true, iitmJoinYear: true, iitmJoinMonth: true, iitmLevel: true, iitmUserType: true,
      isTerminated: true, tokenVersion: true,
      canTerminate: true, canCreateStudents: true,
      isSuperManager: true,
      enrollments: {
        select: {
          course: {
            select: { id: true, name: true, subject: true }
          }
        }
      },
      instructorAssignments: {
        select: {
          course: {
            select: { id: true, name: true, subject: true }
          }
        }
      }
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Security: check termination + token version
  if (user.isTerminated) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const transformedUser = {
    ...user,
    isSuperManager: user.isSuperManager || user.email === 'lkiitmng2428@gmail.com',
  }

  // Remove internal fields from response
  delete transformedUser.isTerminated
  delete transformedUser.tokenVersion

  return NextResponse.json({ user: transformedUser }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken, getCookieConfig } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { v4 as uuidv4 } from 'uuid'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json()

    if (!credential) {
      return NextResponse.json({ error: 'Google credential is required' }, { status: 400 })
    }

    // Verify the Google ID token using Google's tokeninfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    
    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
    }

    const googlePayload = await googleRes.json()

    // Verify the audience matches our client ID
    if (googlePayload.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Token audience mismatch' }, { status: 401 })
    }

    const email = googlePayload.email?.toLowerCase()
    const fullName = googlePayload.name || googlePayload.email?.split('@')[0] || 'Google User'
    const firstName = fullName.split(' ')[0] || ''
    const lastName = fullName.split(' ').slice(1).join(' ') || ''

    if (!email) {
      return NextResponse.json({ error: 'Email not found in Google token' }, { status: 400 })
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // Existing user — check if terminated
      if (user.isTerminated) {
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact support.' },
          { status: 403 }
        )
      }

      // Mark as Google user if not already
      if (!user.isGoogleUser) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { isGoogleUser: true }
        })
      }
    } else {
      // New user — create account as STUDENT with Google auth

      // Generate security number
      const securityNumber = `SEC${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      user = await prisma.user.create({
        data: {
          name: fullName,
          firstName,
          lastName,
          email,
          role: 'STUDENT',
          isGoogleUser: true,
          securityNumber,
        }
      })

      // Auto-enroll in demo course if one exists
      const demoCourse = await prisma.course.findFirst({
        where: { isDemo: true }
      })

      if (demoCourse) {
        await prisma.$transaction(async (tx) => {
          await tx.enrollment.create({
            data: {
              userId: user.id,
              courseId: demoCourse.id
            }
          })
          await queueGoogleGroupSyncJobs(tx, {
            userEmail: user.email,
            courseIds: [demoCourse.id],
            action: 'ADD',
          })
        })
      }
    }

    // Increment tokenVersion for session rotation
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true }
    })

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'MANAGER' | 'ADMIN' | 'STUDENT',
      name: user.name,
      canTerminate: user.canTerminate,
      canCreateStudents: user.canCreateStudents,
      tokenVersion: updatedUser.tokenVersion,
    })

    const { name: cookieName, options } = getCookieConfig()
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })

    response.cookies.set(cookieName, token, options)

    // Record attendance
    await prisma.loginLog.create({
      data: { userId: user.id }
    })

    logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      securityNumber: user.securityNumber,
      actionType: ACTION.USER_LOGIN,
      actionDescription: `${user.name} logged in via Google`,
      moduleName: MODULE.AUTH,
    })

    return response
  } catch (error: any) {
    console.error('Google auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

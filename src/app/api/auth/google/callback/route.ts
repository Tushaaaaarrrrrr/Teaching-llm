import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken, getCookieConfig, JWTPayload } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

const DEFAULT_COURSE_NAME = 'Demo Course'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${error}`, baseUrl))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=NoCodeProvided', baseUrl))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=GoogleLoginNotConfigured', baseUrl))
    }

    const state = searchParams.get('state')
    const isLinking = state === 'link_calendar'

    // Exchange the authorization code for an access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Failed to get Google access token', tokenData)
      return NextResponse.redirect(new URL('/login?error=GoogleAuthFailed', baseUrl))
    }

    // Fetch user profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    
    const userData = await userRes.json()
    const email = userData.email?.toLowerCase().trim()
    if (!email) {
      return NextResponse.redirect(new URL('/login?error=GoogleEmailMissing', baseUrl))
    }

    // --- LINKING FLOW ---
    if (isLinking) {
      const { getSession } = await import('@/lib/auth')
      const session = await getSession()
      
      if (session) {
        // Save the Google Credential
        await prisma.googleCredential.upsert({
          where: { userId: session.userId },
          update: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || '', // Should be provided if access_type=offline and prompt=consent
            expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          },
          create: {
            userId: session.userId,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || '',
            expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          }
        })

        logActivity({
          userId: session.userId,
          userName: session.name,
          userRole: session.role,
          actionType: ACTION.USER_UPDATED,
          actionDescription: `Linked Google Calendar account (${email})`,
          moduleName: MODULE.AUTH,
        })

        return NextResponse.redirect(new URL('/profile?success=CalendarLinked', baseUrl))
      }
    }

    const SUPER_ADMIN_EMAIL = 'lkiitmng2428@gmail.com'

    // Check if the user already exists in our database
    let user = await prisma.user.findUnique({
      where: { email }
    })

    let isNewUser = false

    // Auto-create a Student account if the user doesn't exist
    if (!user) {
      isNewUser = true
      const genSec = () => 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase()
      user = await prisma.user.create({
        data: {
          email,
          name: userData.name || email.split('@')[0],
          passwordHash: '', // Empty = Google OAuth user (used for isGoogleAuth detection)
          role: email === SUPER_ADMIN_EMAIL ? 'MANAGER' : 'STUDENT',
          isSuperManager: email === SUPER_ADMIN_EMAIL,
          avatar: userData.picture || null,
          securityNumber: genSec()
        }
      })

      // ── Auto-enroll into the Demo Course ──
      // Find or create it
      let demoCourse = await prisma.course.findFirst({
        where: { isDemo: true }
      })

      if (!demoCourse) {
        // Find the first manager to be the course creator
        const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } })
        const creatorId = manager?.id || user.id // absolute fallback

        demoCourse = await prisma.course.create({
          data: {
            name: DEFAULT_COURSE_NAME,
            description: 'Welcome! This is your starting course. Explore lectures, materials, and community features here.',
            subject: 'General',
            color: '#6366F1',
            icon: 'BookOpen',
            isDemo: true,
            createdById: creatorId
          }
        })
      }

      // Enroll the new student if they are not a manager
      if (user.role !== 'MANAGER') {
        await prisma.enrollment.create({
          data: { userId: user.id, courseId: demoCourse.id }
        }).catch(() => {
          // In case of unique constraint (already enrolled), silently ignore
        })
      }
    } else {
      // User exists. If it's the super admin but they lost their status (e.g. DB wiped and they logged in as student first), restore it
      if (email === SUPER_ADMIN_EMAIL && (!user.isSuperManager || user.role !== 'MANAGER')) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'MANAGER', isSuperManager: true }
        })
      }
    }
    
    // Prevent login if account is terminated
    if (user.isTerminated) {
      return NextResponse.redirect(new URL('/login?error=AccountDeactivated', baseUrl))
    }

    // ── Login tracking (same as email login) ──
    await prisma.loginLog.create({ data: { userId: user.id } })

    logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      securityNumber: user.securityNumber,
      actionType: ACTION.USER_LOGIN,
      actionDescription: `${user.name} logged in via Google${isNewUser ? ' (new account)' : ''}`,
      moduleName: MODULE.AUTH,
    })

    // Generate our internal JWT for the user session
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'MANAGER' | 'ADMIN' | 'STUDENT',
      name: user.name,
    }
    const token = signToken(payload)

    // Set the cookie and redirect to the dashboard
    const response = NextResponse.redirect(new URL('/dashboard', baseUrl))
    const cookieConfig = getCookieConfig()
    response.cookies.set(cookieConfig.name, token, cookieConfig.options)

    return response

  } catch (error) {
    console.error('Google OAuth Callback Error:', error)
    return NextResponse.redirect(new URL('/login?error=InternalError', baseUrl))
  }
}

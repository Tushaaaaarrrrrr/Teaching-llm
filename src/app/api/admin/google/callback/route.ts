import { NextRequest, NextResponse } from 'next/server'
import { getFullSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  try {
    const session = await getFullSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/login?error=Unauthorized', baseUrl))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`/settings?error=${error}`, baseUrl))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings?error=NoCodeProvided', baseUrl))
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '990282572765-bn1ls79tuhpa589eiici5r9mr6c98c8h.apps.googleusercontent.com')
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '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')
    const redirectUri = `${baseUrl}/api/admin/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/settings?error=GoogleNotConfigured', baseUrl))
    }

    // Exchange the authorization code for an access token + refresh token
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
      console.error('Failed to get Google access token for Calendar', tokenData)
      return NextResponse.redirect(new URL('/settings?error=GoogleAuthFailed', baseUrl))
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Upsert the credentials for this Manager
    await prisma.googleCredential.upsert({
      where: { userId: session.userId },
      update: {
        accessToken: tokenData.access_token,
        ...(tokenData.refresh_token && { refreshToken: tokenData.refresh_token }),
        expiresAt,
        calendarId: 'primary'
      },
      create: {
        userId: session.userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '', // Google only sends it on first auth prompt
        expiresAt,
        calendarId: 'primary'
      }
    })

    return NextResponse.redirect(new URL('/settings?success=CalendarLinked', baseUrl))

  } catch (error) {
    console.error('Google Calendar OAuth Callback Error:', error)
    return NextResponse.redirect(new URL('/settings?error=InternalError', baseUrl))
  }
}

import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getFullSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  const session = await getFullSession()
  if (!session || session.role !== 'MANAGER') {
    return NextResponse.redirect(new URL('/login?error=Unauthorized', baseUrl))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/settings?error=GoogleNotConfigured', baseUrl))
  }

  const redirectUri = `${baseUrl}/api/admin/google/callback`

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.append('client_id', clientId)
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.append('response_type', 'code')
  googleAuthUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar.events.readonly')
  googleAuthUrl.searchParams.append('access_type', 'offline') // Important for getting a refresh token!
  googleAuthUrl.searchParams.append('prompt', 'consent')

  return NextResponse.redirect(googleAuthUrl.toString())
}

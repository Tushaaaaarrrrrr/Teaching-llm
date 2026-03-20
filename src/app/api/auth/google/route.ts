import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin

  if (!clientId) {
    // If credentials aren't set, redirect back with an error
    return NextResponse.redirect(new URL('/login?error=GoogleLoginNotConfigured', baseUrl))
  }

  const isLinking = request.nextUrl.searchParams.get('link') === 'true'
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.append('client_id', clientId)
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.append('response_type', 'code')
  
  const scopes = ['openid', 'email', 'profile']
  if (isLinking) {
    scopes.push('https://www.googleapis.com/auth/calendar.readonly')
    googleAuthUrl.searchParams.append('access_type', 'offline')
    googleAuthUrl.searchParams.append('prompt', 'consent') // Force consent to ensure refresh_token
  } else {
    googleAuthUrl.searchParams.append('prompt', 'select_account')
  }
  
  googleAuthUrl.searchParams.append('scope', scopes.join(' '))
  if (isLinking) {
    googleAuthUrl.searchParams.append('state', 'link_calendar')
  }

  return NextResponse.redirect(googleAuthUrl.toString())
}

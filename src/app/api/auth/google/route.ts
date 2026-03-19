import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  
  if (!clientId) {
    // If credentials aren't set, redirect back with an error
    return NextResponse.redirect(new URL('/login?error=GoogleLoginNotConfigured', request.nextUrl.origin))
  }

  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.append('client_id', clientId)
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.append('response_type', 'code')
  googleAuthUrl.searchParams.append('scope', 'openid email profile')
  googleAuthUrl.searchParams.append('prompt', 'select_account') // Force account selection for better UX

  return NextResponse.redirect(googleAuthUrl.toString())
}

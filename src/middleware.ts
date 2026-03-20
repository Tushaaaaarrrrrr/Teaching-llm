import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/terminated']
const COOKIE_NAME = 'teaching_llm_token'
const JWT_SECRET = process.env.JWT_SECRET || 'teaching-llm-secret-key-change-in-production'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow API auth routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Root redirect
  if (pathname === '/') {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check for auth cookie
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Ful JWT signature verification at the Edge
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    // Role-based route protection
    if (pathname.startsWith('/admin') && (payload.role === 'STUDENT' || payload.role === 'INSTRUCTOR')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/manage') && payload.role === 'STUDENT') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/chat-transcripts') && payload.role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/work-log') && payload.role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    console.error('JWT Verification failed in middleware:', error)
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    '/api/community/:path*',
    '/api/courses/:path*',
  ],
}

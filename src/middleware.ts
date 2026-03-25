import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/terminated']
const COOKIE_NAME = 'teaching_llm_token'
const JWT_SECRET = (process.env.JWT_SECRET || 'teaching-llm-super-secret-jwt-key-2024').trim()

import { checkRateLimit, isMaintenanceModeActive } from '@/lib/ratelimit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Rate Limiting for Auth
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const ip = request.ip ?? '127.0.0.1'
    const { success, reset } = await checkRateLimit(`login_${ip}`, 'login')
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          }
        }
      )
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 2. Global Maintenance Mode Check
  const isMaintenance = await isMaintenanceModeActive()
  
  if (isMaintenance) {
    // Check if it's a contact route or auth route that should be allowed
    const isEssential = pathname.startsWith('/api/auth') || 
                       pathname.startsWith('/api/support') || // "contact developer" logic
                       pathname === '/maintenance'

    if (!isEssential) {
      // Get session to check role
      const token = request.cookies.get(COOKIE_NAME)?.value
      if (token) {
        try {
          const secret = new TextEncoder().encode(JWT_SECRET)
          const { payload } = await jwtVerify(token, secret)
          // If manager, bypass maintenance
          if (payload.role === 'MANAGER') {
            return NextResponse.next()
          }
        } catch (e) {}
      }
      
      // Redirect to maintenance page or block API
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'System is under maintenance' }, { status: 503 })
      }
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
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

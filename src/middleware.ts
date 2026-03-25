import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { checkRateLimit, isMaintenanceModeActive } from '@/lib/ratelimit'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/terminated']
const COOKIE_NAME = 'teaching_llm_token'
const JWT_SECRET = process.env.JWT_SECRET?.trim() || ''

// Methods that modify data — these get CSRF + rate limit checks
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

// API routes exempt from CSRF header check (called by external services or browser forms)
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/google',
  '/api/auth/logout',
  '/api/sync-queue', // cron job — has its own auth via CRON_SECRET
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // ─── 1. Rate Limiting for Login ───
  if (pathname === '/api/auth/login' && method === 'POST') {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
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

  // ─── 2. Rate Limiting for ALL Write Operations ───
  if (pathname.startsWith('/api/') && WRITE_METHODS.includes(method) && !pathname.startsWith('/api/auth/')) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    // Rate limit by user (via JWT userId) or by IP for unauthenticated requests
    let rateLimitKey = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    
    if (token && JWT_SECRET) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        if (payload.userId) {
          rateLimitKey = payload.userId as string
        }
      } catch {}
    }

    const { success } = await checkRateLimit(`write_${rateLimitKey}`, 'general')
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }
  }

  // ─── 3. CSRF Protection for Write API Calls ───
  if (
    pathname.startsWith('/api/') &&
    WRITE_METHODS.includes(method) &&
    !CSRF_EXEMPT_PATHS.some(p => pathname.startsWith(p))
  ) {
    const xRequestedWith = request.headers.get('x-requested-with')
    // Browsers block cross-origin JavaScript from setting custom headers,
    // so requiring this header prevents CSRF attacks from other websites
    if (xRequestedWith !== 'XMLHttpRequest') {
      return NextResponse.json(
        { error: 'Forbidden — missing required header' },
        { status: 403 }
      )
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ─── 4. Global Maintenance Mode Check ───
  const isMaintenance = await isMaintenanceModeActive()
  
  if (isMaintenance) {
    const isEssential = pathname.startsWith('/api/auth') || 
                       pathname.startsWith('/api/support') || 
                       pathname.startsWith('/_next/') ||
                       pathname === '/maintenance' ||
                       pathname === '/maintenance-illustration.jpg' ||
                       /\.(.*)$/.test(pathname)

    if (!isEssential) {
      const token = request.cookies.get(COOKIE_NAME)?.value
      if (token && JWT_SECRET) {
        try {
          const secret = new TextEncoder().encode(JWT_SECRET)
          const { payload } = await jwtVerify(token, secret)
          if (payload.role === 'MANAGER') {
            return NextResponse.next()
          }
        } catch (e) {}
      }
      
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

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set — cannot verify tokens')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Full JWT signature verification at the Edge
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

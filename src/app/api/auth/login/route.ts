import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { comparePassword, signToken, getCookieConfig } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkRateLimit } from '@/lib/ratelimit'
import { getUserAvatar } from '@/lib/avatar'
import { triggerAlert } from '@/lib/alerts'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const { success, remaining, reset } = await checkRateLimit(ip)

    if (!success) {
      triggerAlert({
        userId: 'system',
        userName: 'System (Rate Limit)',
        userRole: 'ADMIN',
        actionType: 'RATE_LIMIT_ABUSE',
        description: `Rate limit hit for IP: ${ip} on login route`,
        moduleName: MODULE.AUTH,
        level: 'MEDIUM',
        metadata: { ip }
      })
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials. Please try again.' }, { status: 401 })
    }

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      triggerAlert({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'FAILED_LOGIN',
        description: `Invalid password attempt for user: ${email}`,
        moduleName: MODULE.AUTH,
        level: 'LOW'
      })
      return NextResponse.json({ error: 'Invalid credentials. Please try again.' }, { status: 401 })
    }

    if (user.isTerminated) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      )
    }

    // Increment tokenVersion to invalidate other old sessions (Token Rotation)
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

    const { name, options } = getCookieConfig()
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: getUserAvatar(user) },
    })

    response.cookies.set(name, token, options)

    // Record Attendance
    await prisma.loginLog.create({
      data: { userId: user.id }
    })

    logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      securityNumber: user.securityNumber,
      actionType: ACTION.USER_LOGIN,
      actionDescription: `${user.name} logged in`,
      moduleName: MODULE.AUTH,
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    triggerAlert({
      userId: 'system',
      userName: 'System Error',
      userRole: 'ADMIN',
      actionType: 'CRITICAL_ERROR',
      description: `Critical error in login route: ${error.message}`,
      moduleName: MODULE.AUTH,
      level: 'HIGH',
      metadata: { error: error.message }
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

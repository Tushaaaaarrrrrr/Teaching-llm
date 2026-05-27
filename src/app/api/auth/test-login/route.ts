import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken, getCookieConfig } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

// Temporary tester sign-in. Gated behind TEST_LOGIN_SECRET env var.
// Set TEST_LOGIN_SECRET on Render to enable; unset it to disable.
export async function POST(request: NextRequest) {
  const expected = process.env.TEST_LOGIN_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'Tester sign-in is disabled.' }, { status: 403 })
  }

  try {
    const { email, secret } = await request.json().catch(() => ({}))

    if (!email || !secret) {
      return NextResponse.json({ error: 'Email and passcode are required.' }, { status: 400 })
    }
    if (secret !== expected) {
      return NextResponse.json({ error: 'Invalid passcode.' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
    if (!user) {
      return NextResponse.json({ error: 'No account exists for that email.' }, { status: 404 })
    }
    if (user.isTerminated) {
      return NextResponse.json({ error: 'Your account has been deactivated.' }, { status: 403 })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    })

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'MANAGER' | 'ADMIN' | 'STUDENT',
      name: user.name,
      canTerminate: user.canTerminate,
      canCreateStudents: user.canCreateStudents,
      tokenVersion: updated.tokenVersion,
    })

    const { name: cookieName, options } = getCookieConfig()
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    })
    response.cookies.set(cookieName, token, options)

    await prisma.loginLog.create({ data: { userId: user.id } })
    logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      securityNumber: user.securityNumber,
      actionType: ACTION.USER_LOGIN,
      actionDescription: `${user.name} logged in via tester sign-in`,
      moduleName: MODULE.AUTH,
    })

    return response
  } catch (error: any) {
    console.error('Test login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

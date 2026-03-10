import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { comparePassword, signToken, getCookieConfig } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.isTerminated) {
      return NextResponse.json(
        { error: 'Your ID has been terminated. Please contact the Admin for further details.' },
        { status: 403 }
      )
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'MANAGER' | 'ADMIN' | 'STUDENT',
      name: user.name,
    })

    const { name, options } = getCookieConfig()
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    })

    response.cookies.set(name, token, options)

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
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

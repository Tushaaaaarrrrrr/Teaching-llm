import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken, getCookieConfig } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Only allow in development mode for safety!
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const targetEmail: string | undefined = body.email
    const targetRole: string | undefined = body.role

    let user
    if (targetEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } })
      if (!user) {
        return NextResponse.json({ error: `User with email ${targetEmail} not found` }, { status: 404 })
      }
    } else if (targetRole) {
      // Find any active user with the requested role — useful for quick mobile dev login
      const normalizedRole = targetRole.toUpperCase()
      user = await prisma.user.findFirst({
        where: { role: normalizedRole as any, isTerminated: { not: true } },
        orderBy: { createdAt: 'desc' },
      })
      if (!user) {
        return NextResponse.json({ error: `No user found with role ${normalizedRole}` }, { status: 404 })
      }
    } else {
      // Legacy default
      user = await prisma.user.findUnique({ where: { email: 'lkiitmng2428@gmail.com' } })
      if (!user) {
        return NextResponse.json({ error: 'Default dev user not found' }, { status: 404 })
      }
    }

    // Read current tokenVersion (don't increment — allows multi-device sessions)
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tokenVersion: true }
    })

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      name: user.name,
      canTerminate: user.canTerminate,
      canCreateStudents: user.canCreateStudents,
      tokenVersion: currentUser?.tokenVersion ?? 0,
    })

    const { name: cookieName, options } = getCookieConfig()
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    })

    response.cookies.set(cookieName, token, options)
    return response
  } catch (error: any) {
    console.error('Dev login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

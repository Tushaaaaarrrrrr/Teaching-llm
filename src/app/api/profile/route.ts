import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { getUserAvatar } from '@/lib/avatar'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        gender: true,
        securityNumber: true,
        createdAt: true,
        passwordHash: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Auto-generate security number if missing
    if (!user.securityNumber) {
      const securityNumber = 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase()
      user = await prisma.user.update({
        where: { id: session.userId },
        data: { securityNumber },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          gender: true,
          securityNumber: true,
          createdAt: true,
          passwordHash: true,
        },
      })
    }

    // Compute isGoogleAuth flag (empty passwordHash = Google OAuth user)
    const { passwordHash, ...safeUser } = user
    return NextResponse.json({ user: { ...safeUser, avatar: getUserAvatar(user), isGoogleAuth: passwordHash === '' } })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        gender: true,
        createdAt: true,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.PROFILE_UPDATED,
      actionDescription: `${session.name} updated their profile`,
      moduleName: MODULE.PROFILE,
    })

    return NextResponse.json({ user: { ...user, avatar: getUserAvatar(user) } })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

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
        firstName: true,
        lastName: true,
        mobileNumber: true,
        email: true,
        role: true,
        avatar: true,
        gender: true,
        genderChangedAt: true,
        securityNumber: true,
        createdAt: true,
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
          firstName: true,
          lastName: true,
          mobileNumber: true,
          email: true,
          role: true,
          avatar: true,
          gender: true,
          genderChangedAt: true,
          securityNumber: true,
          createdAt: true,
        },
      })
    }

    return NextResponse.json({ user })
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

    const { name, firstName, lastName, mobileNumber, gender } = await request.json()

    const data: any = {}
    if (name) data.name = name
    if (firstName) data.firstName = firstName
    if (lastName) data.lastName = lastName
    if (mobileNumber !== undefined) data.mobileNumber = mobileNumber

    // Handle gender update - only allow if not previously changed
    if (gender) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { genderChangedAt: true }
      })
      
      if (user?.genderChangedAt) {
        return NextResponse.json(
          { error: 'Gender can only be changed once' }, 
          { status: 400 }
        )
      }
      
      // Allow gender update and set the timestamp
      if (['MALE', 'FEMALE'].includes(gender.toUpperCase())) {
        data.gender = gender.toUpperCase()
        data.genderChangedAt = new Date()
      } else {
        return NextResponse.json(
          { error: 'Invalid gender value. Must be MALE or FEMALE' }, 
          { status: 400 }
        )
      }
    }

    // Ensure name is updated if firstName/lastName provided
    if (!name && (firstName || lastName)) {
        const current = await prisma.user.findUnique({ where: { id: session.userId }, select: { firstName: true, lastName: true } })
        const fn = firstName || current?.firstName || ''
        const ln = lastName || current?.lastName || ''
        data.name = `${fn} ${ln}`.trim()
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        email: true,
        role: true,
        avatar: true,
        gender: true,
        genderChangedAt: true,
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

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

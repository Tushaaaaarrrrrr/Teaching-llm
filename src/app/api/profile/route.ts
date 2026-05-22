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
        age: true,
        state: true,
        isProfileComplete: true,
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
          age: true,
          state: true,
          isProfileComplete: true,
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

    const { name, firstName, lastName, mobileNumber, gender, age, state } = await request.json()

    const data: any = {}
    if (name !== undefined) data.name = name
    if (firstName !== undefined) data.firstName = firstName
    if (lastName !== undefined) data.lastName = lastName
    if (mobileNumber !== undefined) data.mobileNumber = mobileNumber
    if (age !== undefined) data.age = age ? parseInt(age, 10) : null
    if (state !== undefined) data.state = state

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
      if (['MALE', 'FEMALE', 'OTHER'].includes(gender.toUpperCase())) {
        data.gender = gender.toUpperCase()
        data.genderChangedAt = new Date()
      } else {
        return NextResponse.json(
          { error: 'Invalid gender value. Must be MALE, FEMALE, or OTHER' }, 
          { status: 400 }
        )
      }
    }

    // Ensure name is updated if firstName/lastName provided
    if (name === undefined && (firstName !== undefined || lastName !== undefined)) {
        const current = await prisma.user.findUnique({ where: { id: session.userId }, select: { firstName: true, lastName: true } })
        const fn = firstName !== undefined ? firstName : (current?.firstName || '')
        const ln = lastName !== undefined ? lastName : (current?.lastName || '')
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
        age: true,
        state: true,
        isProfileComplete: true,
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

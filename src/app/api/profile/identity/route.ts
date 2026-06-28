import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { iitmJoinYear, iitmJoinMonth, iitmLevel, iitmUserType } = await request.json()

    // 1. Validations
    const validYears = ['2023', '2024', '2025', '2026']
    if (!iitmJoinYear || !validYears.includes(iitmJoinYear.toString())) {
      return NextResponse.json({ error: 'Please select a valid joining year.' }, { status: 400 })
    }

    const validMonths = ['JAN', 'MAY', 'SEPT']
    const monthUpper = (iitmJoinMonth || '').toString().toUpperCase()
    if (!iitmJoinMonth || !validMonths.includes(monthUpper)) {
      return NextResponse.json({ error: 'Please select a valid joining month.' }, { status: 400 })
    }

    const validLevels = ['Qualifier', 'Foundation', 'Diploma', 'Degree']
    // Case-insensitive match but normalize to standard capitalization
    const levelMatch = validLevels.find(l => l.toLowerCase() === (iitmLevel || '').toString().toLowerCase())
    if (!levelMatch) {
      return NextResponse.json({ error: 'Please select a valid level.' }, { status: 400 })
    }

    const validTypes = ['STANDALONE', 'DUAL DEGREE', 'WORKING PROFESSIONAL']
    const typeUpper = (iitmUserType || '').toString().toUpperCase()
    if (!iitmUserType || !validTypes.includes(typeUpper)) {
      return NextResponse.json({ error: 'Please select a valid category.' }, { status: 400 })
    }

    // 2. Database Update
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        iitmJoinYear: iitmJoinYear.toString(),
        iitmJoinMonth: monthUpper,
        iitmLevel: levelMatch,
        iitmUserType: typeUpper,
        isIdentityUpdated: true,
      },
      select: {
        id: true,
        name: true,
        isIdentityUpdated: true,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.PROFILE_UPDATED,
      actionDescription: `${session.name} updated their IITM identity.`,
      moduleName: MODULE.PROFILE,
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error in identity update:', error)
    return NextResponse.json({ error: 'Internal server error while saving identity.' }, { status: 500 })
  }
}

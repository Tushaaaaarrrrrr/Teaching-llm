import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { decryptPassword } from '@/lib/encryption'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        encryptedTempPassword: true, 
        passwordRevealCount: true 
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!targetUser.encryptedTempPassword) {
      return NextResponse.json({ error: 'No temporary password available. Please reset password.' }, { status: 400 })
    }

    if (targetUser.passwordRevealCount >= 2) {
      return NextResponse.json({ error: 'Password reveal limit reached (max 2). Please reset password.' }, { status: 403 })
    }

    const password = decryptPassword(targetUser.encryptedTempPassword)
    if (!password) {
      return NextResponse.json({ error: 'Failed to decrypt password. Please reset password.' }, { status: 500 })
    }

    // Increment reveal count
    await prisma.user.update({
      where: { id },
      data: { passwordRevealCount: targetUser.passwordRevealCount + 1 }
    })

    // Log the reveal action
    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: 'PASSWORD_REVEAL',
      actionDescription: `${session.name} revealed temporary password for user ${targetUser.name} (${targetUser.email}). Count: ${targetUser.passwordRevealCount + 1}/2`,
      moduleName: MODULE.USER_MGMT,
      targetId: id,
    })

    return NextResponse.json({ password, count: targetUser.passwordRevealCount + 1 })
  } catch (error) {
    console.error('Error revealing password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

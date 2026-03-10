import { NextResponse } from 'next/server'
import { getCookieConfig, getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST() {
  const session = await getSession()
  const { name } = getCookieConfig()
  const response = NextResponse.json({ success: true })
  response.cookies.delete(name)

  if (session) {
    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.USER_LOGOUT,
      actionDescription: `${session.name} logged out`,
      moduleName: MODULE.AUTH,
    })
  }

  return response
}

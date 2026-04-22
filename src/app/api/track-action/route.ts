import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Note: logActivity already ignores MANAGER actions, so managers won't pollute logs
    const { action } = await request.json()
    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.USER_CLICK,
      actionDescription: action,
      moduleName: MODULE.PROFILE, // Or generic module
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

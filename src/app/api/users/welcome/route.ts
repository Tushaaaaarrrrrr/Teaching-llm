import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { hasSeenWelcome: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating welcome status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

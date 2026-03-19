import { NextResponse } from 'next/server'
import { getFullSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getFullSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ isLinked: false })
    }

    const cred = await prisma.googleCredential.findUnique({
      where: { userId: session.userId }
    })

    return NextResponse.json({
      isLinked: !!cred,
      calendarId: cred?.calendarId || null
    })
  } catch (error) {
    console.error('Google status error:', error)
    return NextResponse.json({ isLinked: false })
  }
}

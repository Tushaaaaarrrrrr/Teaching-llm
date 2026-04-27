import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transactions = await prisma.upgradeTransaction.findMany({
      where: { userId: session.userId },
      include: {
        course: { select: { id: true, name: true, subject: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching user transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

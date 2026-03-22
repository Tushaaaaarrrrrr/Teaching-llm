import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession } from '@/lib/auth'

export async function PUT(req: Request) {
  try {
    const session = await getFullSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, daysLeft } = await req.json()

    if (typeof title !== 'string' || typeof daysLeft !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const existing = await prisma.examCountdown.findFirst()

    let countdown
    if (existing) {
      countdown = await prisma.examCountdown.update({
        where: { id: existing.id },
        data: { title, daysLeft }
      })
    } else {
      countdown = await prisma.examCountdown.create({
        data: { title, daysLeft }
      })
    }

    return NextResponse.json(countdown)
  } catch (error) {
    console.error('Exam Countdown Update Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

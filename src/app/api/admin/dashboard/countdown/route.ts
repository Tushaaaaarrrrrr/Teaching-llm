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

    if (typeof title !== 'string' || typeof daysLeft !== 'number' || daysLeft < 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Calculate deadline date: today + daysLeft days at 12:01 AM IST
    const today = new Date()
    const deadlineDate = new Date(today)
    deadlineDate.setDate(deadlineDate.getDate() + daysLeft)
    deadlineDate.setHours(0, 1, 0, 0) // 12:01 AM

    const existing = await prisma.examCountdown.findFirst()

    let countdown
    if (existing) {
      countdown = await prisma.examCountdown.update({
        where: { id: existing.id },
        data: { title, deadlineDate }
      })
    } else {
      countdown = await prisma.examCountdown.create({
        data: { title, deadlineDate }
      })
    }

    // Return with calculated daysLeft for display
    const calculatedDaysLeft = Math.max(
      0,
      Math.ceil((countdown.deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    )

    return NextResponse.json({
      ...countdown,
      daysLeft: calculatedDaysLeft
    })
  } catch (error) {
    console.error('Exam Countdown Update Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

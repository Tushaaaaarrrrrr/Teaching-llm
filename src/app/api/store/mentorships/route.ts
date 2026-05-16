import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { mentorName, description, pricePerSlot, slotDuration } = data

    if (!mentorName || !pricePerSlot) {
      return NextResponse.json({ error: 'Mentor name and price are required' }, { status: 400 })
    }

    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    })

    if (!manager) {
      return NextResponse.json({ error: 'No manager found to assign as creator' }, { status: 500 })
    }

    const mentorship = await prisma.mentorshipOffering.create({
      data: {
        mentorName,
        description,
        pricePerSlot: Number(pricePerSlot),
        slotDuration: Number(slotDuration),
        createdById: manager.id,
      }
    })

    return NextResponse.json({ mentorship })
  } catch (error: any) {
    console.error('Error creating mentorship:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const mentorships = await prisma.mentorshipOffering.findMany({
      orderBy: { createdAt: 'desc' },
      include: { bookings: true }
    })
    return NextResponse.json({ mentorships })
  } catch (error: any) {
    console.error('Error fetching mentorships:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

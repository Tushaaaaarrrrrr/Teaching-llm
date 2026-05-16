import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const { mentorName, mentorTitle, description, pricePerSlot, slotDuration, mentorId } = data

    if (!mentorName || !pricePerSlot) {
      return NextResponse.json({ error: 'Mentor name and price are required' }, { status: 400 })
    }

    const mentorship = await prisma.mentorshipOffering.create({
      data: {
        mentorName,
        mentorTitle: mentorTitle || "IIT Mentorship Specialist",
        description,
        pricePerSlot: Number(pricePerSlot),
        slotDuration: Number(slotDuration),
        mentorId: mentorId || null,
        createdById: session.userId,
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
      include: { 
        bookings: true,
        mentor: { select: { id: true, name: true, email: true, role: true } }
      }
    })
    return NextResponse.json({ mentorships })
  } catch (error: any) {
    console.error('Error fetching mentorships:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

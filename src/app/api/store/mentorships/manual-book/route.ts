import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    // Only Managers can manually book for others
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { studentId, mentorshipId, date, time } = await request.json()

    if (!studentId || !mentorshipId || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create the booking as PAID
    const booking = await prisma.mentorshipBooking.create({
      data: {
        userId: studentId,
        mentorshipId: mentorshipId,
        slotDate: date,
        slotTime: time,
        amount: 0, // Manual booking
        status: 'PAID',
        userNote: 'Manually booked by Manager'
      }
    })

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('Error creating manual booking:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

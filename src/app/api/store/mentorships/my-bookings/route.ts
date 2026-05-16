import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookings = await prisma.mentorshipBooking.findMany({
      where: { userId: session.userId, status: 'PAID' },
      include: {
        mentorship: {
          select: {
            mentorName: true,
            avatarUrl: true,
            slotDuration: true
          }
        }
      },
      orderBy: [
        { slotDate: 'desc' },
        { slotTime: 'desc' }
      ]
    })

    return NextResponse.json({ bookings })
  } catch (error: any) {
    console.error('Error fetching my mentorship bookings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

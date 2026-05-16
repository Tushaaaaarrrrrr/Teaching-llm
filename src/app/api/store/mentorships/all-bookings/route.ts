import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookings = await prisma.mentorshipBooking.findMany({
      where: { status: 'PAID' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        mentorship: {
          select: { mentorName: true }
        }
      },
      orderBy: [
        { slotDate: 'desc' },
        { slotTime: 'desc' }
      ]
    })

    return NextResponse.json({ bookings })
  } catch (error: any) {
    console.error('Error fetching all mentorship bookings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

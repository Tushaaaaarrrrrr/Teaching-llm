import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { sendEmailNotification } from '@/lib/email-service'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meetLink } = await request.json()
    const { id } = params

    // Fetch the booking with relations to get emails
    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        mentorship: { 
          select: { 
            mentorName: true,
            mentor: { select: { email: true, name: true } }
          } 
        }
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Update the booking
    const updated = await prisma.mentorshipBooking.update({
      where: { id },
      data: { meetLink }
    })

    // If meetLink is added, trigger the 'meet_invite' email
    if (meetLink) {
      await sendEmailNotification('meet_invite', {
        userEmail: booking.user.email,
        userName: booking.user.name,
        mentorName: booking.mentorship.mentorName,
        mentorEmail: booking.mentorship.mentor?.email,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime,
        meetLink: meetLink
      })
    }

    return NextResponse.json({ success: true, booking: updated })
  } catch (error: any) {
    console.error('Error updating booking meet link:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    // Only Managers can cancel/delete a PAID booking
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized: Only Managers can cancel bookings' }, { status: 403 })
    }

    const { id } = params
    
    // First find it to see if it was a paid booking
    const booking = await prisma.mentorshipBooking.findUnique({ where: { id } })
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Optional: Add logic to refund or just delete
    await prisma.mentorshipBooking.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting booking:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

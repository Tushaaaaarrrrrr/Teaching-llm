import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Update all bookings linked to this order
    const bookings = await prisma.mentorshipBooking.findMany({
      where: { razorpayOrderId: razorpay_order_id },
      include: {
        user: { select: { email: true, name: true } },
        mentorship: { select: { mentorName: true } }
      }
    })

    await prisma.mentorshipBooking.updateMany({
      where: { razorpayOrderId: razorpay_order_id },
      data: {
        status: 'PAID',
        orderId: razorpay_payment_id
      }
    })

    // Trigger confirmation email for each booking
    const { sendEmailNotification } = require('@/lib/email-service')
    for (const booking of bookings) {
      await sendEmailNotification('mentorship_confirmed', {
        userEmail: booking.user.email,
        userName: booking.user.name,
        mentorName: booking.mentorship.mentorName,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/courses/explore?view=mentorship`
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

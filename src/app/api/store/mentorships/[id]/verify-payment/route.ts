import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
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

    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Update booking status
    await prisma.mentorshipBooking.update({
      where: { id: bookingId },
      data: {
        status: 'PAID',
        orderId: razorpay_payment_id // Storing payment ID here for reference
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

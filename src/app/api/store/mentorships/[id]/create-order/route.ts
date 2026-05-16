import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Razorpay from 'razorpay'
import { getSession } from '@/lib/auth'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { slotDate, slotTime } = await req.json()
    if (!slotDate || !slotTime) {
      return NextResponse.json({ error: 'Date and time are required' }, { status: 400 })
    }

    const mentorship = await prisma.mentorshipOffering.findUnique({
      where: { id: params.id }
    })

    if (!mentorship) {
      return NextResponse.json({ error: 'Mentorship offering not found' }, { status: 404 })
    }

    const existingBooking = await prisma.mentorshipBooking.findFirst({
      where: { mentorshipId: mentorship.id, slotDate, slotTime, status: 'PAID' }
    })
    
    if (existingBooking) {
      return NextResponse.json({ error: 'This time slot is already booked.' }, { status: 400 })
    }

    const price = mentorship.pricePerSlot

    if (price === 0) {
      // Handle free mentorship booking
      const booking = await prisma.mentorshipBooking.create({
        data: {
          mentorshipId: mentorship.id,
          userId: user.id,
          slotDate,
          slotTime,
          amount: 0,
          status: 'PAID'
        }
      })
      return NextResponse.json({ isFree: true, bookingId: booking.id })
    }

    // Create Razorpay Order
    const options = {
      amount: Math.round(price * 100),
      currency: 'INR',
      receipt: `mentor_${user.id.slice(0, 8)}_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)

    // Create pending booking
    const booking = await prisma.mentorshipBooking.create({
      data: {
        mentorshipId: mentorship.id,
        userId: user.id,
        slotDate,
        slotTime,
        amount: price,
        status: 'PENDING',
        razorpayOrderId: order.id
      }
    })

    return NextResponse.json({
      razorpayOrderId: order.id,
      amount: options.amount,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      bookingId: booking.id
    })
  } catch (error: any) {
    console.error('Error creating mentorship order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

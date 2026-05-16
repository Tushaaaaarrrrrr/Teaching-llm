import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Razorpay from 'razorpay'
import { getSession } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const session = await getSession()
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { slotDate, slotTimes } = await req.json()
    if (!slotDate || !slotTimes || !Array.isArray(slotTimes) || slotTimes.length === 0) {
      return NextResponse.json({ error: 'Date and at least one time slot are required' }, { status: 400 })
    }

    const mentorship = await prisma.mentorshipOffering.findUnique({
      where: { id: params.id }
    })

    if (!mentorship) {
      return NextResponse.json({ error: 'Mentorship offering not found' }, { status: 404 })
    }

    // Check for past reservations and existing bookings (Queue/Lock System)
    const now = new Date()
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000)

    for (const slotTime of slotTimes) {
      const slotDateTime = new Date(`${slotDate}T${slotTime}:00`)
      if (slotDateTime < now) {
        return NextResponse.json({ error: `Slot at ${slotTime} is in the past` }, { status: 400 })
      }

      const conflict = await prisma.mentorshipBooking.findFirst({
        where: { 
          mentorshipId: mentorship.id, 
          slotDate, 
          slotTime, 
          OR: [
            { status: 'PAID' },
            { 
              status: 'PENDING', 
              createdAt: { gte: fiveMinsAgo } 
            }
          ]
        }
      })

      if (conflict) {
        // If it's the SAME user having a pending booking, we let them proceed (they might be retrying)
        if (conflict.userId === user.id && conflict.status === 'PENDING') {
          continue; 
        }
        return NextResponse.json({ error: `Slot at ${slotTime} is temporarily held or already booked.` }, { status: 400 })
      }
    }

    const pricePerSlot = mentorship.pricePerSlot
    const totalAmount = pricePerSlot * slotTimes.length

    if (totalAmount === 0) {
      // Handle free mentorship booking for all slots
      const bookings = await Promise.all(slotTimes.map(slotTime => 
        prisma.mentorshipBooking.upsert({
          where: {
            mentorshipId_slotDate_slotTime: {
              mentorshipId: mentorship.id,
              slotDate,
              slotTime
            }
          },
          update: {
            userId: user.id,
            amount: 0,
            status: 'PAID'
          },
          create: {
            mentorshipId: mentorship.id,
            userId: user.id,
            slotDate,
            slotTime,
            amount: 0,
            status: 'PAID'
          }
        })
      ))
      return NextResponse.json({ isFree: true, bookingIds: bookings.map(b => b.id) })
    }

    // Create Razorpay Order
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `mentor_${user.id.slice(0, 8)}_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)

    // Create pending bookings for all slots
    const bookings = await Promise.all(slotTimes.map(slotTime => 
      prisma.mentorshipBooking.upsert({
        where: {
          mentorshipId_slotDate_slotTime: {
            mentorshipId: mentorship.id,
            slotDate,
            slotTime
          }
        },
        update: {
          userId: user.id,
          amount: pricePerSlot,
          status: 'PENDING',
          razorpayOrderId: order.id
        },
        create: {
          mentorshipId: mentorship.id,
          userId: user.id,
          slotDate,
          slotTime,
          amount: pricePerSlot,
          status: 'PENDING',
          razorpayOrderId: order.id
        }
      })
    ))

    return NextResponse.json({
      razorpayOrderId: order.id,
      amount: options.amount,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      bookingIds: bookings.map(b => b.id)
    })
  } catch (error: any) {
    console.error('Error creating mentorship order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Razorpay from 'razorpay'
import { getServerSession } from 'next-auth'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const note = await prisma.storeNote.findUnique({
      where: { id: params.id }
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Check if user already has active access (valid for 30 days)
    const existingAccess = await prisma.storeNoteAccess.findFirst({
      where: { noteId: note.id, userId: user.id }
    })
    
    if (existingAccess) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      if (existingAccess.createdAt > thirtyDaysAgo) {
        return NextResponse.json({ error: 'You already have active access to this note.' }, { status: 400 })
      } else {
        // Expired, delete the old access so we can create a new one (or just let them buy again)
        await prisma.storeNoteAccess.delete({ where: { id: existingAccess.id } })
      }
    }

    const price = note.price

    if (price === 0) {
      // Free access
      const access = await prisma.storeNoteAccess.create({
        data: {
          noteId: note.id,
          userId: user.id,
        }
      })
      return NextResponse.json({ isFree: true })
    }

    // Create Razorpay Order
    const options = {
      amount: Math.round(price * 100),
      currency: 'INR',
      receipt: `note_${user.id.slice(0, 8)}_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)

    return NextResponse.json({
      razorpayOrderId: order.id,
      amount: options.amount,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (error: any) {
    console.error('Error creating note order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

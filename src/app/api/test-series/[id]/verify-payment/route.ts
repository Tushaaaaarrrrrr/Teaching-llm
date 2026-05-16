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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, accessId } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !accessId) {
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

    const access = await (prisma as any).testSeriesAccess.findUnique({
      where: { id: accessId }
    })

    if (!access) {
      return NextResponse.json({ error: 'Access record not found' }, { status: 404 })
    }

    // Update access with payment details
    await (prisma as any).testSeriesAccess.update({
      where: { id: accessId },
      data: {
        razorpayPaymentId: razorpay_payment_id,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

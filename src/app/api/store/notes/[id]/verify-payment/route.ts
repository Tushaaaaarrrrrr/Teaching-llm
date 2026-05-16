import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { logActivity, MODULE, ACTION } from '@/lib/activity-log'
import { sendEmailNotification } from '@/lib/email-service'

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

    // Create Note Access record after successful payment
    const access = await prisma.storeNoteAccess.create({
      data: {
        noteId: params.id,
        userId: user.id,
        orderId: razorpay_payment_id
      },
      include: { note: true }
    })

    // Log the purchase
    logActivity({
      userId: user.id,
      userName: user.name || user.email || 'User',
      userRole: user.role,
      actionType: ACTION.PURCHASE_COMPLETED,
      actionDescription: `Purchased study note: ${access.note.title} for ₹${access.note.price}`,
      moduleName: MODULE.STORE,
      targetId: access.id,
      metadata: {
        itemType: 'STUDY_NOTE',
        itemId: params.id,
        amount: access.note.price,
        razorpayPaymentId: razorpay_payment_id
      }
    })
    
    // Trigger purchase confirmation email
    await sendEmailNotification('purchase', {
      userEmail: user.email,
      userName: user.name,
      orderId: razorpay_payment_id,
      itemName: access.note.title,
      amount: access.note.price,
      date: new Date().toLocaleDateString(),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/purchased`
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Note payment verification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

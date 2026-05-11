import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Razorpay from 'razorpay'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! })

    const body = await request.json()
    // body: { buyAll: boolean, accessType: 'RECORDED'|'LIVE', selectedCourseIds?: string[] , perCourseAccessTypes?: Record<string,string> }
    const { buyAll, accessType, selectedCourseIds, perCourseAccessTypes } = body

    if (!['RECORDED', 'LIVE'].includes(accessType)) return NextResponse.json({ error: 'Invalid access type' }, { status: 400 })

    const bundle = await prisma.bundleOffering.findUnique({ where: { id: params.id }, include: { courses: { include: { course: true } } } })
    if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })

    // Determine which courses to charge for
    let courseEntries: Array<{ courseId: string; accessType: string; price: number }> = []

    if (buyAll) {
      // If bundle has a bundle price for the selected access type, create a single item with bundle price but still create per-course items for enrollments
      const bundlePrice = accessType === 'RECORDED' ? bundle.recordedDiscountPrice ?? bundle.recordedOriginalPrice : bundle.liveDiscountPrice ?? bundle.liveOriginalPrice
      if (bundlePrice == null) {
        // Fallback to summing individual prices
        for (const bc of bundle.courses) {
          // Find course offering for this course
          const offering = await prisma.courseOffering.findFirst({ where: { courseId: bc.course.id } })
          const price = accessType === 'RECORDED' ? (offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0) : (offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0)
          courseEntries.push({ courseId: bc.course.id, accessType, price })
        }
      } else {
        // Use bundle price - assign the bundle price to the first course in the bundle and mark others as 0
        let first = true
        for (const bc of bundle.courses) {
          if (first) {
            courseEntries.push({ courseId: bc.course.id, accessType, price: Number(bundlePrice) })
            first = false
          } else {
            courseEntries.push({ courseId: bc.course.id, accessType, price: 0 })
          }
        }
      }
    } else {
      const sel = Array.isArray(selectedCourseIds) && selectedCourseIds.length ? selectedCourseIds : []
      if (sel.length === 0) return NextResponse.json({ error: 'No courses selected' }, { status: 400 })
      for (const cid of sel) {
        const offering = await prisma.courseOffering.findFirst({ where: { courseId: cid } })
        const perType = perCourseAccessTypes && perCourseAccessTypes[cid] ? perCourseAccessTypes[cid] : accessType
        const price = perType === 'RECORDED' ? (offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0) : (offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0)
        courseEntries.push({ courseId: cid, accessType: perType, price })
      }
    }

    // Create pending order
    const totalAmount = Math.round(courseEntries.reduce((s, it) => s + (it.price || 0), 0) * 100)
    const order = await prisma.order.create({ data: { userId: session.userId, amount: totalAmount / 100, status: 'PENDING', items: { create: courseEntries.map(it => ({ courseOfferingId: null, courseId: it.courseId === params.id ? it.courseId : it.courseId, accessType: it.accessType, price: it.price })) } }, include: { items: true } })

    const razorpayOrder = await razorpay.orders.create({ amount: totalAmount, currency: 'INR', receipt: order.id, notes: { orderId: order.id, bundleId: params.id, userId: session.userId, userName: session.name, type: 'BUNDLE_PURCHASE' } })

    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: razorpayOrder.id } })

    return NextResponse.json({ orderId: order.id, razorpayOrderId: razorpayOrder.id, amount: totalAmount, currency: 'INR', keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, bundleName: bundle.name, userName: session.name, userEmail: session.email })
  } catch (error) {
    console.error('[bundle create-order] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

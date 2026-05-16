import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code, bundleOfferingId, subtotal, perCourseAccessTypes } = await request.json()

    if (!code) return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })

    if (!coupon) return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 })

    // CRITICAL: Live Bundle Coupon Validation
    // If the coupon code contains "LIVE", we check if perCourseAccessTypes are all "LIVE"
    if (coupon.code.includes('LIVE') && perCourseAccessTypes) {
      const accessTypes = Object.values(perCourseAccessTypes)
      const allLive = accessTypes.every(type => type === 'LIVE')
      if (accessTypes.length > 0 && !allLive) {
        return NextResponse.json({ error: 'This LIVE coupon requires all subjects in the bundle to be set to LIVE.' }, { status: 400 })
      }
    }

    // Check active
    if (!coupon.isActive) return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 })

    // Check start date
    if (coupon.startDate && new Date() < new Date(coupon.startDate)) {
      return NextResponse.json({ error: 'This coupon is not yet active' }, { status: 400 })
    }

    // Check expiry
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })
    }

    // Check max uses
    if (coupon.maxUses != null && coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 })
    }

    // Check single use per user
    if (coupon.isSingleUsePerUser) {
      const existingUsage = await prisma.couponUsage.findFirst({
        where: { couponId: coupon.id, userId: session.userId }
      })
      if (existingUsage) {
        return NextResponse.json({ error: 'You have already used this coupon' }, { status: 400 })
      }
    }

    // Check first purchase only
    if (coupon.isFirstPurchaseOnly) {
      const existingOrders = await prisma.order.findFirst({
        where: { userId: session.userId, status: 'PAID' }
      })
      if (existingOrders) {
        return NextResponse.json({ error: 'This coupon is only valid for first-time purchases' }, { status: 400 })
      }
    }

    // Check user email restrictions
    if (coupon.targetUserEmails) {
      try {
        const emails: string[] = JSON.parse(coupon.targetUserEmails)
        if (emails.length > 0 && !emails.includes(session.email)) {
          return NextResponse.json({ error: 'This coupon is not available for your account' }, { status: 400 })
        }
      } catch { /* if not valid JSON, skip */ }
    }

    // Check bundle-specific applicability
    if (coupon.applicability === 'BUNDLE' && bundleOfferingId) {
      if (coupon.targetBundleIds) {
        try {
          const bundleIds: string[] = JSON.parse(coupon.targetBundleIds)
          if (bundleIds.length > 0 && !bundleIds.includes(bundleOfferingId)) {
            return NextResponse.json({ error: 'This coupon is not valid for this bundle' }, { status: 400 })
          }
        } catch { /* if not valid JSON, skip */ }
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue != null && subtotal != null && Number(subtotal) < coupon.minOrderValue) {
      return NextResponse.json({ error: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon` }, { status: 400 })
    }

    // Calculate discount
    let discountAmount = 0
    const orderSubtotal = Number(subtotal) || 0
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((orderSubtotal * coupon.discountValue) / 100)
    } else if (coupon.discountType === 'FIXED') {
      discountAmount = coupon.discountValue
    }

    // Cap discount so total never goes below 0
    discountAmount = Math.min(discountAmount, orderSubtotal)

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      message: `Coupon applied! You save ₹${discountAmount}`
    })
  } catch (error) {
    console.error('[coupon-validate] Error:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}

/**
 * Utility functions for robust price extraction and fallback calculation for external purchases/enrollments.
 */

interface OfferingPriceData {
  courseId: string
  hasRecorded: boolean
  recordedDiscountPrice: number | null
  recordedOriginalPrice: number | null
  hasLive: boolean
  liveDiscountPrice: number | null
  liveOriginalPrice: number | null
}

/**
 * Extracts and parses amount from body regardless of parameter naming or currency formatting.
 */
export function extractAndParseAmount(body: any): number {
  if (!body || typeof body !== 'object') return 0

  // Standard and common third-party webhook/form field names for amount
  const candidateKeys = [
    'finalPrice',
    'final_price',
    'amount',
    'price',
    'total',
    'totalPrice',
    'total_price',
    'paidAmount',
    'paid_amount',
    'amountPaid',
    'amount_paid',
    'netAmount',
    'net_amount',
    'paymentAmount',
    'payment_amount',
    'orderAmount',
    'order_amount',
    'total_amount',
    'grandTotal',
    'grand_total',
    'cost',
    'fee',
    'pricePaid',
    'price_paid',
    'value',
  ]

  let rawVal: any = null

  // Check top-level keys
  for (const key of candidateKeys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      rawVal = body[key]
      break
    }
  }

  // Check nested containers if top level didn't match
  if (rawVal === null) {
    const containers = [body.payment, body.data, body.order, body.transaction, body.payload]
    for (const container of containers) {
      if (container && typeof container === 'object') {
        for (const key of candidateKeys) {
          if (container[key] !== undefined && container[key] !== null && container[key] !== '') {
            rawVal = container[key]
            break
          }
        }
        if (rawVal !== null) break
      }
    }
  }

  return parseAmountStringOrNumber(rawVal)
}

/**
 * Parses numeric strings with currency symbols ("₹49", "Rs. 49", "INR 49", "1,499.00", "Rs. 499.00")
 */
export function parseAmountStringOrNumber(val: unknown): number {
  if (typeof val === 'number') {
    return isFinite(val) && val > 0 ? val : 0
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    // Match number sequences with optional commas and decimals, e.g. "1,499.50" or "499"
    const match = trimmed.match(/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/)
    if (match) {
      const numStr = match[0].replace(/,/g, '')
      const parsed = parseFloat(numStr)
      if (isFinite(parsed) && parsed > 0) {
        return parsed
      }
    }
  }
  return 0
}

/**
 * Fallback course price lookup from DB when external form doesn't provide a price.
 */
export async function getFallbackCoursePrices(
  txOrPrisma: any,
  courseIds: string[],
  classTypeMap?: Map<string, 'LIVE' | 'RECORDED'>
): Promise<{ totalPrice: number; coursePrices: Record<string, number> }> {
  let totalPrice = 0
  const coursePrices: Record<string, number> = {}

  if (!courseIds || courseIds.length === 0) {
    return { totalPrice: 0, coursePrices: {} }
  }

  try {
    const offerings: OfferingPriceData[] = await txOrPrisma.courseOffering.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        courseId: true,
        hasRecorded: true,
        recordedDiscountPrice: true,
        recordedOriginalPrice: true,
        hasLive: true,
        liveDiscountPrice: true,
        liveOriginalPrice: true,
      },
    })

    const offeringMap = new Map<string, OfferingPriceData>(offerings.map(o => [o.courseId, o]))

    for (const courseId of courseIds) {
      const accessType = classTypeMap?.get(courseId) ?? 'RECORDED'
      const offering = offeringMap.get(courseId)

      let price = 0
      if (offering) {
        if (accessType === 'LIVE') {
          price = offering.liveDiscountPrice ?? offering.liveOriginalPrice ?? offering.recordedDiscountPrice ?? offering.recordedOriginalPrice ?? 0
        } else {
          price = offering.recordedDiscountPrice ?? offering.recordedOriginalPrice ?? offering.liveDiscountPrice ?? offering.liveOriginalPrice ?? 0
        }
      }

      coursePrices[courseId] = price
      totalPrice += price
    }
  } catch (err) {
    console.error('[external-price] Error looking up fallback course prices:', err)
  }

  return { totalPrice, coursePrices }
}

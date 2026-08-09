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

export interface AmountExtractionResult {
  amount: number
  sourcePath: string | null
  rawValue: unknown
  isReliable: boolean
  convertedFromPaise: boolean
}

/**
 * Extracts and parses amount from body regardless of parameter naming or currency formatting.
 */
export function extractAndParseAmount(body: any): number {
  return extractExternalPaidAmount(body).amount
}

export function extractExternalPaidAmount(body: any): AmountExtractionResult {
  if (!body || typeof body !== 'object') {
    return {
      amount: 0,
      sourcePath: null,
      rawValue: undefined,
      isReliable: false,
      convertedFromPaise: false,
    }
  }

  const candidate = findAmountCandidate(body)
  if (!candidate) {
    return {
      amount: 0,
      sourcePath: null,
      rawValue: undefined,
      isReliable: false,
      convertedFromPaise: false,
    }
  }

  const parsed = parseAmountStringOrNumber(candidate.rawValue)
  const convertedFromPaise = shouldTreatAsPaise(candidate)
  const amount = convertedFromPaise ? parsed / 100 : parsed

  return {
    amount,
    sourcePath: candidate.path,
    rawValue: candidate.rawValue,
    isReliable: amount > 0 || isExplicitZeroAmount(candidate.rawValue),
    convertedFromPaise,
  }
}

function findAmountCandidate(body: any): { rawValue: unknown; path: string; key: string; container: any } | null {
  // Standard and common third-party webhook/form field names for amount
  const candidateKeys = [
    'finalPrice',
    'final_price',
    'finalAmount',
    'final_amount',
    'payableAmount',
    'payable_amount',
    'amount',
    'amountInPaise',
    'amount_in_paise',
    'amountPaise',
    'amount_paise',
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

  const containers: Array<{ value: any; path: string }> = [
    { value: body, path: 'body' },
    { value: body.payment, path: 'body.payment' },
    { value: body.payment?.entity, path: 'body.payment.entity' },
    { value: body.data, path: 'body.data' },
    { value: body.data?.payment, path: 'body.data.payment' },
    { value: body.data?.payment?.entity, path: 'body.data.payment.entity' },
    { value: body.order, path: 'body.order' },
    { value: body.order?.entity, path: 'body.order.entity' },
    { value: body.transaction, path: 'body.transaction' },
    { value: body.payload, path: 'body.payload' },
    { value: body.payload?.payment, path: 'body.payload.payment' },
    { value: body.payload?.payment?.entity, path: 'body.payload.payment.entity' },
  ]

  for (const { value, path } of containers) {
    if (!value || typeof value !== 'object') continue
    for (const key of candidateKeys) {
      if (value[key] !== undefined && value[key] !== null && value[key] !== '') {
        return { rawValue: value[key], path: `${path}.${key}`, key, container: value }
      }
    }
  }

  return null
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

function isExplicitZeroAmount(val: unknown): boolean {
  if (typeof val === 'number') {
    return isFinite(val) && val === 0
  }

  if (typeof val !== 'string') return false

  const normalized = val
    .trim()
    .toLowerCase()
    .replace(/(?:rs\.?|inr|₹|\s|,)/g, '')

  return normalized === '0' ||
    normalized === '0.0' ||
    normalized === '0.00' ||
    normalized === 'free' ||
    normalized === 'complimentary' ||
    normalized === 'nocharge'
}

function shouldTreatAsPaise(candidate: { path: string; key: string; container: any }): boolean {
  const key = candidate.key.toLowerCase()
  if (key.includes('paise')) return true

  const container = candidate.container
  const path = candidate.path.toLowerCase()
  const looksLikeRazorpayEntity =
    container?.currency === 'INR' &&
    key === 'amount' &&
    (
      container?.entity === 'payment' ||
      container?.entity === 'order' ||
      typeof container?.order_id === 'string' ||
      (typeof container?.id === 'string' && /^(pay|order)_/.test(container.id))
    )

  return looksLikeRazorpayEntity || /razorpay.*amount/.test(path)
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

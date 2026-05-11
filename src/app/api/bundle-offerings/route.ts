import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const bundles = await prisma.bundleOffering.findMany({
      include: {
        createdBy: { select: { id: true, name: true } },
        courses: { include: { course: { select: { id: true, name: true, color: true, icon: true, teacherName: true, isDisabled: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Filter out disabled courses for non-managers
    const session = await getSession()
    const role = session?.role
    const filtered = bundles.map(b => ({
      ...b,
      courses: b.courses.filter(cc => {
        if (role === 'MANAGER' || role === 'SUPER_ADMIN') return true
        return !cc.course.isDisabled
      })
    }))

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('[bundle-offerings] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch bundle offerings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'MANAGER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { name, description, courseIds, recordedOriginalPrice, recordedDiscountPrice, liveOriginalPrice, liveDiscountPrice, allowIndividualPurchase } = data

    if (!name || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: 'Bundle name and at least one course are required' }, { status: 400 })
    }

    // Validate courses exist
    const found = await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, isDisabled: true } })
    if (found.length !== courseIds.length) {
      return NextResponse.json({ error: 'Some selected courses were not found' }, { status: 400 })
    }

    const bundle = await prisma.bundleOffering.create({
      data: {
        name,
        description,
        createdById: session.userId,
        recordedOriginalPrice: recordedOriginalPrice || undefined,
        recordedDiscountPrice: recordedDiscountPrice || undefined,
        liveOriginalPrice: liveOriginalPrice || undefined,
        liveDiscountPrice: liveDiscountPrice || undefined,
        allowIndividualPurchase: allowIndividualPurchase == null ? true : !!allowIndividualPurchase,
        courses: {
          create: courseIds.map((cid: string) => ({ courseId: cid }))
        }
      },
      include: { courses: { include: { course: true } } }
    })

    return NextResponse.json(bundle)
  } catch (error) {
    console.error('[bundle-offerings] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create bundle offering' }, { status: 500 })
  }
}

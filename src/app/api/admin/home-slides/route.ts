import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

/**
 * GET: Fetch all active carousel banners.
 * Accessible to any authenticated user (students and staff).
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slides = await prisma.homeSlide.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(slides)
  } catch (error) {
    console.error('Error fetching home slides:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST: Create a new banner slide.
 * Restricted to Managers/Admins. Maximum limit of 10 slides.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { image, alt, href, order } = await request.json()

    if (!image || !href) {
      return NextResponse.json({ error: 'Image URL and CTA Link are required' }, { status: 400 })
    }

    // Enforce maximum 10 slides limit
    const slideCount = await prisma.homeSlide.count()
    if (slideCount >= 10) {
      return NextResponse.json({ error: 'Maximum limit of 10 slides reached. Remove an existing slide first.' }, { status: 400 })
    }

    const slide = await prisma.homeSlide.create({
      data: {
        image,
        alt: alt || 'Promo slide',
        href,
        order: typeof order === 'number' ? order : slideCount,
      },
    })

    return NextResponse.json(slide, { status: 201 })
  } catch (error) {
    console.error('Error creating home slide:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT: Reorder or bulk update slides.
 * Restricted to Managers/Admins.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { slides } = await request.json()

    if (!Array.isArray(slides)) {
      return NextResponse.json({ error: 'Invalid input. Array of slides expected.' }, { status: 400 })
    }

    // Perform bulk updates in transaction
    await prisma.$transaction(
      slides.map((s: any) =>
        prisma.homeSlide.update({
          where: { id: s.id },
          data: {
            order: s.order,
            alt: s.alt,
            href: s.href,
          },
        })
      )
    )

    const updatedSlides = await prisma.homeSlide.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(updatedSlides)
  } catch (error) {
    console.error('Error updating home slides:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

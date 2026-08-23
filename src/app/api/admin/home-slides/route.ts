import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

/**
 * GET: Fetch all active carousel banners.
 * Accessible to any authenticated user (students and staff).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const manage = request.nextUrl.searchParams.get('manage') === '1'
    const canManage = isAdminOrManager(session.role)
    let carouselEnabled = true
    try {
      const settings = await prisma.updateSystemSettings.findUnique({
        where: { id: 'singleton' },
        select: { homeCarouselEnabled: true },
      })
      carouselEnabled = settings?.homeCarouselEnabled !== false
    } catch (error) {
      // Keep existing carousels visible while older deployments are waiting for
      // the managed-home-content migration.
      console.warn('Home carousel setting is unavailable; defaulting to enabled:', error)
    }

    if (!manage && !carouselEnabled) {
      return NextResponse.json([])
    }

    let slides
    try {
      slides = await prisma.homeSlide.findMany({
        where: manage && canManage ? undefined : { isActive: true },
        orderBy: { order: 'asc' },
      })
    } catch (error) {
      // `isActive` was added with the managed-home-content migration. Select
      // only legacy columns so existing banners still load before it is run.
      console.warn('Home slide active state is unavailable; loading legacy slides:', error)
      const legacySlides = await prisma.homeSlide.findMany({
        orderBy: { order: 'asc' },
        select: {
          id: true,
          image: true,
          alt: true,
          href: true,
          order: true,
        },
      })
      slides = legacySlides.map((slide) => ({ ...slide, isActive: true }))
    }

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

    const { image, alt, href, order, isActive } = await request.json()

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
        isActive: isActive !== false,
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
            ...(typeof s.isActive === 'boolean' && { isActive: s.isActive }),
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

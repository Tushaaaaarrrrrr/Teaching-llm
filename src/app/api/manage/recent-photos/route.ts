import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch images from NotificationCampaigns, SystemUpdates, and HomeSlides
    const [campaigns, updates, slides] = await Promise.all([
      prisma.notificationCampaign.findMany({
        where: {
          imageUrl: { not: null },
        },
        select: { imageUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.systemUpdate.findMany({
        where: {
          imageUrl: { not: null },
        },
        select: { imageUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.homeSlide.findMany({
        select: { image: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    const rawPhotos: { url: string; createdAt: Date }[] = []

    campaigns.forEach(c => {
      if (c.imageUrl) rawPhotos.push({ url: c.imageUrl, createdAt: c.createdAt })
    })

    updates.forEach(u => {
      if (u.imageUrl) rawPhotos.push({ url: u.imageUrl, createdAt: u.createdAt })
    })

    slides.forEach(s => {
      if (s.image) rawPhotos.push({ url: s.image, createdAt: s.createdAt })
    })

    // Deduplicate by URL, keeping the most recent createdAt date
    const photoMap = new Map<string, Date>()
    for (const item of rawPhotos) {
      const trimmed = item.url.trim()
      if (!trimmed || trimmed === '' || trimmed.includes('example.com/banner.png') || trimmed.includes('example.com/image.png')) {
        continue
      }
      const existing = photoMap.get(trimmed)
      if (!existing || existing < item.createdAt) {
        photoMap.set(trimmed, item.createdAt)
      }
    }

    const sortedPhotos = Array.from(photoMap.entries())
      .map(([url, createdAt]) => ({ url, createdAt }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Offset-based pagination
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedPhotos = sortedPhotos.slice(startIndex, endIndex)
    const totalPhotos = sortedPhotos.length
    const hasNext = endIndex < totalPhotos

    return NextResponse.json({
      photos: paginatedPhotos.map(p => p.url),
      pagination: {
        page,
        limit,
        total: totalPhotos,
        hasNext,
      }
    })
  } catch (error) {
    console.error('Error fetching recent photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

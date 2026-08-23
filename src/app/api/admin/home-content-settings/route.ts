import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

const defaults = {
  homeCarouselEnabled: true,
  promoSplashEnabled: false,
  promoSplashImage: '/splash-screen.png',
  promoSplashDurationMs: 2500,
  promoSplashTargetPages: '/dashboard',
  promoSplashFrequency: 'ONCE',
  promoSplashIntervalDays: 1,
  promoSplashVersion: 1,
}

export async function GET() {
  try {
    const settings = await prisma.updateSystemSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        homeCarouselEnabled: true,
        promoSplashEnabled: true,
        promoSplashImage: true,
        promoSplashDurationMs: true,
        promoSplashTargetPages: true,
        promoSplashFrequency: true,
        promoSplashIntervalDays: true,
        promoSplashVersion: true,
      },
    })

    return NextResponse.json({
      ...defaults,
      ...settings,
      promoSplashImage: settings?.promoSplashImage || defaults.promoSplashImage,
    })
  } catch (error) {
    console.error('Error fetching home content settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const duration = Number(body.promoSplashDurationMs)
    const promoSplashDurationMs = Number.isFinite(duration)
      ? Math.min(10000, Math.max(1000, Math.round(duration)))
      : defaults.promoSplashDurationMs
    const interval = Number(body.promoSplashIntervalDays)
    const promoSplashIntervalDays = Number.isFinite(interval)
      ? Math.min(365, Math.max(1, Math.round(interval)))
      : defaults.promoSplashIntervalDays
    const frequency = body.promoSplashFrequency === 'RECURRING' ? 'RECURRING' : 'ONCE'
    const targetPages = Array.isArray(body.promoSplashTargetPages)
      ? body.promoSplashTargetPages.join(',')
      : String(body.promoSplashTargetPages || defaults.promoSplashTargetPages)
    const existing = await prisma.updateSystemSettings.findUnique({ where: { id: 'singleton' } })
    const imageChanged = typeof body.promoSplashImage === 'string' &&
      body.promoSplashImage !== (existing?.promoSplashImage || defaults.promoSplashImage)
    const resetViews = body.resetPromoSplashViews === true

    const settings = await prisma.updateSystemSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        homeCarouselEnabled: body.homeCarouselEnabled !== false,
        promoSplashEnabled: body.promoSplashEnabled === true,
        promoSplashImage: body.promoSplashImage || null,
        promoSplashDurationMs,
        promoSplashTargetPages: targetPages,
        promoSplashFrequency: frequency,
        promoSplashIntervalDays,
        promoSplashVersion: 1,
      },
      update: {
        ...(typeof body.homeCarouselEnabled === 'boolean' && {
          homeCarouselEnabled: body.homeCarouselEnabled,
        }),
        ...(typeof body.promoSplashEnabled === 'boolean' && {
          promoSplashEnabled: body.promoSplashEnabled,
        }),
        ...(typeof body.promoSplashImage === 'string' && {
          promoSplashImage: body.promoSplashImage || null,
        }),
        promoSplashDurationMs,
        ...(body.promoSplashTargetPages !== undefined && { promoSplashTargetPages: targetPages }),
        ...(body.promoSplashFrequency !== undefined && { promoSplashFrequency: frequency }),
        ...(body.promoSplashIntervalDays !== undefined && { promoSplashIntervalDays }),
        ...((imageChanged || resetViews) && { promoSplashVersion: { increment: 1 } }),
      },
      select: {
        homeCarouselEnabled: true,
        promoSplashEnabled: true,
        promoSplashImage: true,
        promoSplashDurationMs: true,
        promoSplashTargetPages: true,
        promoSplashFrequency: true,
        promoSplashIntervalDays: true,
        promoSplashVersion: true,
      },
    })

    return NextResponse.json({
      ...settings,
      promoSplashImage: settings.promoSplashImage || defaults.promoSplashImage,
    })
  } catch (error) {
    console.error('Error updating home content settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

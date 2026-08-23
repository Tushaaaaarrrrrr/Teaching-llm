import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

function normalizePage(value: unknown) {
  const page = typeof value === 'string' ? value.trim() : ''
  if (!page.startsWith('/')) return ''
  return page.length > 1 ? page.replace(/\/+$/, '') : page
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ eligible: false })

    const page = normalizePage((await request.json()).page)
    if (!page) return NextResponse.json({ eligible: false })

    const result = await prisma.$transaction(async tx => {
      const settings = await tx.updateSystemSettings.findUnique({
        where: { id: 'singleton' },
      })
      if (!settings?.promoSplashEnabled || !settings.promoSplashImage) {
        return { eligible: false as const }
      }

      const targets = settings.promoSplashTargetPages
        .split(',')
        .map(normalizePage)
        .filter(Boolean)
      const pageMatches = targets.some(target => {
        const candidates = target === '/more' ? ['/more', '/menu'] : [target]
        return candidates.some(candidate =>
          page === candidate || page.startsWith(`${candidate}/`)
        )
      })
      if (!pageMatches) return { eligible: false as const }

      const view = await tx.promoSplashView.findUnique({
        where: { userId: session.userId },
      })
      const sameVersion = view?.version === settings.promoSplashVersion
      if (sameVersion && settings.promoSplashFrequency === 'ONCE') {
        return { eligible: false as const }
      }
      if (sameVersion && settings.promoSplashFrequency === 'RECURRING' && view) {
        const elapsedDays = (Date.now() - view.viewedAt.getTime()) / 86_400_000
        if (elapsedDays < settings.promoSplashIntervalDays) {
          return { eligible: false as const }
        }
      }

      await tx.promoSplashView.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          version: settings.promoSplashVersion,
        },
        update: {
          version: settings.promoSplashVersion,
          viewedAt: new Date(),
        },
      })

      return {
        eligible: true as const,
        image: settings.promoSplashImage,
        durationMs: settings.promoSplashDurationMs,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error claiming promotional splash:', error)
    return NextResponse.json({ eligible: false })
  }
}

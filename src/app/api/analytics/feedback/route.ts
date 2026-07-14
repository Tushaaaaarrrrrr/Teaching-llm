import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedbacks = await (prisma as any).appFeedback.findMany()

    const appFeedbacks = feedbacks.filter((f: any) => f.platform === 'APP')
    const webFeedbacks = feedbacks.filter((f: any) => f.platform === 'WEB')

    const getAvgRating = (list: any[]) => {
      if (list.length === 0) return 0
      const total = list.reduce((sum, f) => sum + f.rating, 0)
      return total / list.length
    }

    const getDistribution = (list: any[]) => {
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      list.forEach(f => {
        if (f.rating >= 1 && f.rating <= 5) {
          dist[f.rating as 1 | 2 | 3 | 4 | 5]++
        }
      })
      return dist
    }

    return NextResponse.json({
      appCount: appFeedbacks.length,
      appAvg: getAvgRating(appFeedbacks),
      appDist: getDistribution(appFeedbacks),
      webCount: webFeedbacks.length,
      webAvg: getAvgRating(webFeedbacks),
      webDist: getDistribution(webFeedbacks)
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

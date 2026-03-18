import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pollId = params.id
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    // If cache is fresh, return it
    if (poll.lastResultsUpdate && poll.lastResultsUpdate > oneHourAgo && poll.cachedResults) {
      return NextResponse.json(JSON.parse(poll.cachedResults))
    }

    // Otherwise recalculate
    const responses = await prisma.pollResponse.groupBy({
      by: ['optionId'],
      where: { pollId },
      _count: { _all: true }
    })

    const results = poll.options.map(opt => {
      const resp = responses.find(r => r.optionId === opt.id)
      return {
        id: opt.id,
        text: opt.text,
        count: resp?._count._all || 0
      }
    })

    const totalVotes = results.reduce((sum, r) => sum + r.count, 0)
    const finalData = {
      results,
      totalVotes,
      refreshedAt: new Date()
    }

    // Update cache
    await prisma.poll.update({
      where: { id: pollId },
      data: {
        cachedResults: JSON.stringify(finalData),
        lastResultsUpdate: new Date()
      }
    })

    return NextResponse.json(finalData)
  } catch (error) {
    console.error('Error fetching poll results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

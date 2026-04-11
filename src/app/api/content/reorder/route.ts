import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    // STRICTLY MANAGER ONLY
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { items } = body

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // STRICT RULE: Only allow updating 'order', strictly forbid 'topicId' updates.
    // Ensure we fetch current parent topic to validate they aren't trying to change parents.
    const ids = items.map((i: any) => i.id)
    const existing = await prisma.content.findMany({
      where: { id: { in: ids } },
      select: { id: true, topicId: true }
    })
    
    const existingMap = new Map(existing.map(e => [e.id, e.topicId]))

    const updates = []
    for (const item of items) {
      const currentTopicId = existingMap.get(item.id)
      if (!currentTopicId) continue

      // If client requests changing parent topic, strictly reject
      if (item.topicId && item.topicId !== currentTopicId) {
        return NextResponse.json({ 
          error: 'Moving lectures between topics is strictly prohibited.' 
        }, { status: 400 })
      }

      // Safe update: only 'order' is mutated
      updates.push(
        prisma.content.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    }

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reordering lectures:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

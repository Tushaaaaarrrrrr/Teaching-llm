import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET() {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { order: 'asc' } })
    return NextResponse.json(faqs)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { question, answer, order } = await request.json()
    const faq = await prisma.faq.create({
      data: { question, answer, order: order ?? 0 },
    })
    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.FAQ_CREATED,
      actionDescription: `${session.name} created FAQ "${question}"`,
      moduleName: MODULE.FAQ,
      targetId: faq.id,
    })

    return NextResponse.json(faq, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

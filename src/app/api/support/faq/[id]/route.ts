import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { question, answer, order } = await request.json()
    const faq = await prisma.faq.update({
      where: { id: params.id },
      data: { question, answer, order },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.FAQ_UPDATED,
      actionDescription: `${session.name} updated FAQ`,
      moduleName: MODULE.FAQ,
      targetId: params.id,
    })

    return NextResponse.json(faq)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const faq = await prisma.faq.findUnique({
      where: { id: params.id },
      select: { question: true },
    })

    await prisma.faq.delete({ where: { id: params.id } })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.FAQ_DELETED,
      actionDescription: `${session.name} deleted FAQ "${faq?.question}"`,
      moduleName: MODULE.FAQ,
      targetId: params.id,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

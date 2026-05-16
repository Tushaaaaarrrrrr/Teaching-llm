import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const manager = await prisma.user.findFirst({
      where: { email: session.email, role: 'MANAGER' }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { slots } = await req.json()
    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'Invalid slots format' }, { status: 400 })
    }

    await prisma.mentorshipOffering.update({
      where: { id: params.id },
      data: {
        availableSlots: JSON.stringify(slots)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating slots:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

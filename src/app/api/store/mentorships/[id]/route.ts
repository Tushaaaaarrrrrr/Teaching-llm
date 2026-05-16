import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // Check if manager
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.mentorshipOffering.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting mentorship:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { mentorName, description, pricePerSlot, slotDuration } = await req.json()

    // Check if manager
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updated = await prisma.mentorshipOffering.update({
      where: { id },
      data: {
        mentorName,
        description,
        pricePerSlot: Number(pricePerSlot),
        slotDuration: Number(slotDuration),
      }
    })

    return NextResponse.json({ mentorship: updated })
  } catch (error: any) {
    console.error('Error updating mentorship:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

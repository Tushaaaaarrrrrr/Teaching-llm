import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const session = await getSession()
    
    // Only MANAGER can delete the whole offering
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized: Only Managers can delete offerings' }, { status: 403 })
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
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mentorName, mentorTitle, description, pricePerSlot, slotDuration, mentorId } = await req.json()

    // Fetch existing
    const existing = await prisma.mentorshipOffering.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check permissions: Manager can edit all. Admin can only edit if they are the assigned mentor.
    const isAssignedMentor = existing.mentorId === session.userId
    const isManager = session.role === 'MANAGER'

    if (!isManager && !isAssignedMentor) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own assigned mentorship' }, { status: 403 })
    }

    const updated = await prisma.mentorshipOffering.update({
      where: { id },
      data: {
        mentorName,
        mentorTitle: mentorTitle !== undefined ? mentorTitle : existing.mentorTitle,
        description,
        pricePerSlot: Number(pricePerSlot),
        slotDuration: Number(slotDuration),
        mentorId: mentorId !== undefined ? mentorId : existing.mentorId
      }
    })

    return NextResponse.json({ mentorship: updated })
  } catch (error: any) {
    console.error('Error updating mentorship:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

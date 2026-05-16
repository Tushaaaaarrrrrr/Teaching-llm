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

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.email) {
      return NextResponse.json({ materials: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email }
    })

    if (!user) return NextResponse.json({ materials: [] })

    // Find all active Note accesses for this user
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const accesses = await prisma.storeNoteAccess.findMany({
      where: {
        userId: user.id,
        createdAt: { gt: thirtyDaysAgo }
      },
      include: {
        note: {
          include: { files: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const purchasedMaterials = accesses.map(acc => ({
      id: acc.id,
      noteId: acc.note.id,
      title: acc.note.title,
      description: acc.note.description,
      fileUrl: '', // Hide raw file URL from JSON payload, client will request it via download endpoint
      purchasedAt: acc.createdAt,
      expiresAt: new Date(acc.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    }))

    return NextResponse.json({ materials: purchasedMaterials })
  } catch (error: any) {
    console.error('Error fetching purchased materials:', error)
    return NextResponse.json({ materials: [] })
  }
}

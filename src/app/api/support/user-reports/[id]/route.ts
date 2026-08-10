import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

const REPORT_STATUSES = new Set(['NEW', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'])

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminOrManager(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { status, reviewNote } = await request.json()
    const nextStatus = typeof status === 'string' ? status.trim().toUpperCase() : ''
    if (!REPORT_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'Invalid report status' }, { status: 400 })
    }

    const existing = await prisma.userReport.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    })
    if (!existing) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const cleanNote = typeof reviewNote === 'string' && reviewNote.trim()
      ? reviewNote.trim().slice(0, 1000)
      : null

    const report = await prisma.userReport.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        reviewedById: session.userId,
        reviewedAt: new Date(),
        reviewNote: cleanNote,
        audits: {
          create: {
            actorId: session.userId,
            action: 'STATUS_UPDATED',
            fromStatus: existing.status,
            toStatus: nextStatus,
            note: cleanNote,
          },
        },
      },
      include: {
        reportedUser: { select: { id: true, name: true, role: true, avatar: true, gender: true } },
        reporter: { select: { id: true, name: true, role: true, avatar: true, gender: true } },
        reviewedBy: { select: { id: true, name: true, role: true } },
        audits: {
          include: { actor: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error updating user report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

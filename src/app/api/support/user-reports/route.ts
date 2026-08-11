import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

function formatReport(report: any, includeReporter: boolean) {
  return {
    id: report.id,
    reason: report.reason,
    subReason: report.subReason,
    details: report.details,
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    reviewedAt: report.reviewedAt,
    reviewNote: report.reviewNote,
    reportedUser: report.reportedUser,
    reporter: includeReporter ? report.reporter : undefined,
    reviewedBy: includeReporter ? report.reviewedBy : undefined,
    audits: includeReporter ? report.audits : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const staff = isAdminOrManager(session.role)
    const where: Record<string, unknown> = staff ? {} : { reportedUserId: session.userId }
    if (status) where.status = status

    const reports = await prisma.userReport.findMany({
      where,
      include: {
        reportedUser: { select: { id: true, name: true, role: true, avatar: true, gender: true } },
        reporter: { select: { id: true, name: true, role: true, avatar: true, gender: true } },
        reviewedBy: { select: { id: true, name: true, role: true } },
        audits: {
          include: { actor: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reports.map(report => formatReport(report, staff)))
  } catch (error) {
    console.error('Error fetching user reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

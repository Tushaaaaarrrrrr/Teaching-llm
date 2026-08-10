import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

const REPORT_REASONS = new Set([
  'SPAM',
  'HARASSMENT_BULLYING',
  'ABUSIVE_LANGUAGE',
  'INAPPROPRIATE_CONTENT',
  'IMPERSONATION',
  'SCAM_FRAUD',
  'UNWANTED_MESSAGES',
  'ACADEMIC_MISCONDUCT',
  'OTHER',
])

function reasonLabel(reason: string) {
  return reason
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.userId === params.userId) {
      return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 })
    }
    if (isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Staff accounts manage reports through Support tools' }, { status: 403 })
    }

    const { reason, details } = await request.json()
    const normalizedReason = typeof reason === 'string' ? reason.trim().toUpperCase() : ''
    const cleanDetails = typeof details === 'string' ? details.trim().slice(0, 2000) : ''

    if (!REPORT_REASONS.has(normalizedReason)) {
      return NextResponse.json({ error: 'Please select a valid report reason' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, name: true, role: true, isTerminated: true },
    })
    if (!target || target.isTerminated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (target.role === 'MANAGER' || target.role === 'ADMIN') {
      return NextResponse.json({ error: 'Managers cannot be reported from Social Cards' }, { status: 403 })
    }

    const duplicateCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existing = await prisma.userReport.findFirst({
      where: {
        reportedUserId: target.id,
        reporterId: session.userId,
        reason: normalizedReason,
        status: { in: ['NEW', 'UNDER_REVIEW'] },
        createdAt: { gte: duplicateCutoff },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'You already submitted this report recently' }, { status: 409 })
    }

    const report = await prisma.userReport.create({
      data: {
        reportedUserId: target.id,
        reporterId: session.userId,
        reason: normalizedReason,
        details: cleanDetails || null,
        audits: {
          create: {
            actorId: session.userId,
            action: 'CREATED',
            toStatus: 'NEW',
          },
        },
      },
      select: {
        id: true,
        reason: true,
        details: true,
        createdAt: true,
      },
    })

    await prisma.notification.create({
      data: {
        userId: target.id,
        title: 'Your account received a user report.',
        content: `Reason: ${reasonLabel(report.reason)}${report.details ? `\nAdditional details: ${report.details}` : ''}\nDate: ${report.createdAt.toLocaleDateString('en-GB')}`,
        type: 'USER_REPORT',
      },
    })

    return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating user report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

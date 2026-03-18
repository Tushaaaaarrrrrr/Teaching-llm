import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isManager } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

interface TranscriptRow {
  messageId: string
  userName: string
  userRole: string
  userSecurityNumber: string
  timestamp: string
  message: string
  isDeleted: boolean
  deletedAt: string
  communityName: string
  communitySubject: string
}

function buildTranscriptRows(messages: any[]): TranscriptRow[] {
  return messages.map(msg => ({
    messageId: msg.id,
    userName: msg.sender.name,
    userRole: msg.sender.role,
    userSecurityNumber: msg.sender.securityNumber || '',
    timestamp: new Date(msg.createdAt).toISOString(),
    message: msg.content,
    isDeleted: msg.isDeleted,
    deletedAt: msg.deletedAt ? new Date(msg.deletedAt).toISOString() : '',
    communityName: msg.class.name,
    communitySubject: msg.class.subject || '',
  }))
}

function escapeCsvField(field: string): string {
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function toCsv(rows: TranscriptRow[]): string {
  const headers = [
    'Message ID', 'User Name', 'User Role', 'Security Number',
    'Timestamp', 'Message', 'Is Deleted', 'Deleted At',
    'Community Name', 'Community Subject',
  ]
  const lines = [headers.map(escapeCsvField).join(',')]
  for (const row of rows) {
    lines.push([
      row.messageId, row.userName, row.userRole, row.userSecurityNumber,
      row.timestamp, row.message, String(row.isDeleted), row.deletedAt,
      row.communityName, row.communitySubject,
    ].map(escapeCsvField).join(','))
  }
  return lines.join('\n')
}

function toPdfHtml(rows: TranscriptRow[], className: string): string {
  const deletedRowStyle = 'background:#fff5f5;'
  const tableRows = rows.map(row => `
    <tr style="${row.isDeleted ? deletedRowStyle : ''}">
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;white-space:nowrap;">${escapeHtml(row.userName)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escapeHtml(row.userSecurityNumber)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;white-space:nowrap;">${escapeHtml(row.timestamp)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;max-width:350px;word-break:break-word;">${escapeHtml(row.message)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">${row.isDeleted ? '<span style="color:#ef4444;font-weight:600;">Deleted</span>' : '<span style="color:#22c55e;">Active</span>'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;white-space:nowrap;">${row.isDeleted ? escapeHtml(row.deletedAt) : '-'}</td>
    </tr>`).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chat Transcript - ${escapeHtml(className)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #1e1e3a; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #6b6b8a; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px 10px; background: #3636e8; color: #fff; font-size: 12px; font-weight: 600; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>Community Chat Transcript: ${escapeHtml(className)}</h1>
  <div class="meta">Exported on ${new Date().toISOString()} &middot; ${rows.length} total messages &middot; ${rows.filter(r => r.isDeleted).length} deleted</div>
  <table>
    <thead>
      <tr>
        <th>User</th>
        <th>Security #</th>
        <th>Timestamp</th>
        <th>Message</th>
        <th>Status</th>
        <th>Deleted At</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Manager access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const format = searchParams.get('format') || 'json'

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const cls = await prisma.course.findUnique({ where: { id: courseId }, select: { name: true, subject: true } })
    if (!cls) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const messages = await prisma.communityMessage.findMany({
      where: { courseId },
      include: {
        sender: {
          select: { id: true, name: true, role: true, securityNumber: true },
        },
        course: {
          select: { name: true, subject: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const rows = buildTranscriptRows(messages)

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.TRANSCRIPT_EXPORTED,
      actionDescription: `${session.name} exported transcript for class "${cls.name}"`,
      moduleName: MODULE.COMMUNITY,
      targetId: courseId,
    })

    if (format === 'csv') {
      const csv = toCsv(rows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="transcript-${courseId}.csv"`,
        },
      })
    }

    if (format === 'pdf') {
      const html = toPdfHtml(rows, cls.name)
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="transcript-${courseId}.html"`,
        },
      })
    }

    // Default: JSON
    return new NextResponse(JSON.stringify({
      community: { name: cls.name, subject: cls.subject },
      exportedAt: new Date().toISOString(),
      totalMessages: rows.length,
      deletedMessages: rows.filter(r => r.isDeleted).length,
      messages: rows,
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="transcript-${courseId}.json"`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

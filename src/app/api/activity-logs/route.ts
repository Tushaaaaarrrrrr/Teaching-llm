import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { getSession, isManagerOrSuperAdmin } from '../../../lib/auth'

function escapeCsvField(field: string): string {
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isManagerOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Manager access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role')
    const moduleName = searchParams.get('moduleName')
    const actionType = searchParams.get('actionType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const exportFormat = searchParams.get('export')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: any = {}

    where.NOT = [
      { actionDescription: { contains: 'direct', mode: 'insensitive' } },
      { actionType: 'USER_CLICK' }
    ]

    if (userId) {
      where.userId = userId
    }

    if (role) {
      where.userRole = role
    } else {
      where.userRole = { not: 'MANAGER' }
    }

    if (moduleName) {
      where.moduleName = moduleName
    }

    if (actionType) {
      where.actionType = actionType
    }

    if (dateFrom || dateTo) {
      const timestampFilter: Record<string, Date> = {}
      if (dateFrom) {
        timestampFilter.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        timestampFilter.lte = end
      }
      where.timestamp = timestampFilter
    }

    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { actionDescription: { contains: search } },
      ]
    }

    // For export, fetch all matching records (no pagination)
    if (exportFormat === 'csv' || exportFormat === 'json') {
      const logs = await prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
      })

      if (exportFormat === 'csv') {
        const headers = [
          'Log ID', 'User Name', 'User Role', 'Security Number',
          'Action Type', 'Action Description', 'Module', 'Target ID',
          'Timestamp',
        ]
        const lines = [headers.map(escapeCsvField).join(',')]
        for (const log of logs) {
          lines.push([
            log.id,
            log.userName,
            log.userRole,
            log.securityNumber || '',
            log.actionType,
            log.actionDescription,
            log.moduleName,
            log.targetId || '',
            new Date(log.timestamp).toISOString(),
          ].map(escapeCsvField).join(','))
        }
        const csv = lines.join('\n')
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        })
      }

      // JSON export
      return new NextResponse(JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalRecords: logs.length,
        logs,
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    }

    // Paginated response
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isManagerOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { logId } = await request.json()
    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 })
    }

    await prisma.activityLog.delete({
      where: { id: logId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activity log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

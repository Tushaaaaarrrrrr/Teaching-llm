import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const studentId = searchParams.get('studentId')?.trim() || ''
    const exportFormat = searchParams.get('export')?.toLowerCase()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit

    const whereClause: any = {}

    if (studentId) {
      whereClause.studentId = studentId
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { student: { mobileNumber: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // CSV Export Flow
    if (exportFormat === 'csv') {
      const allContacts = await prisma.studentContact.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              mobileNumber: true,
            },
          },
        },
      })

      const csvRows: string[] = [
        ['Contact Name', 'Phone Number', 'Email', 'Source', 'Synced By Student', 'Student Email', 'Student Phone', 'Sync Date'].map(escapeCsv).join(','),
      ]

      for (const c of allContacts) {
        csvRows.push([
          c.name || 'Unnamed',
          c.phoneNumber || '',
          c.email || '',
          c.source || 'APP',
          c.student?.name || 'Unknown',
          c.student?.email || '',
          c.student?.mobileNumber || '',
          new Date(c.createdAt).toISOString(),
        ].map(escapeCsv).join(','))
      }

      const csvContent = csvRows.join('\n')
      const fileName = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    }

    // Paginated List & Summary Metrics
    const [total, contacts, studentCount, totalUniquePhones] = await Promise.all([
      prisma.studentContact.count({ where: whereClause }),
      prisma.studentContact.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              gender: true,
              mobileNumber: true,
            },
          },
        },
      }),
      prisma.studentContact.groupBy({
        by: ['studentId'],
      }).then(r => r.length),
      prisma.studentContact.groupBy({
        by: ['phoneNumber'],
      }).then(r => r.length),
    ])

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalContacts: total,
        totalStudentsWithContacts: studentCount,
        uniquePhoneNumbers: totalUniquePhones,
      },
    })
  } catch (error) {
    console.error('Error fetching admin contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

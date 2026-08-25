import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const exportFormat = searchParams.get('export')?.toLowerCase()

    const contacts = await prisma.studentContact.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (exportFormat === 'csv') {
      const studentName = contacts[0]?.student?.name || 'student'
      const csvRows: string[] = [
        ['Contact Name', 'Phone Number', 'Email', 'Source', 'Sync Date'].map(escapeCsv).join(','),
      ]

      for (const c of contacts) {
        csvRows.push([
          c.name || 'Unnamed',
          c.phoneNumber || '',
          c.email || '',
          c.source || 'APP',
          new Date(c.createdAt).toISOString(),
        ].map(escapeCsv).join(','))
      }

      const csvContent = csvRows.join('\n')
      const fileName = `${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_contacts_${new Date().toISOString().slice(0, 10)}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    }

    return NextResponse.json({
      contacts,
      total: contacts.length,
    })
  } catch (error) {
    console.error('Error fetching student contacts by ID:', error)
    return NextResponse.json({ error: 'Failed to fetch student contacts' }, { status: 500 })
  }
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

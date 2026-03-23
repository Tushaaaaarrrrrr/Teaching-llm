import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const courseId = searchParams.get('courseId')

    const where: any = {}
    if (courseId) {
      where.courseId = courseId
    } else {
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      if (accessibleCourseIds !== null) {
        where.OR = [
          { isGlobal: true },
          { courseId: { in: accessibleCourseIds } }
        ]
      }
    }

    const events = await prisma.courseEvent.findMany({
      where,
      include: {
        course: { select: { name: true } },
      },
      orderBy: { startTime: 'desc' },
    })

    const data = events.map(ev => ({
      id: ev.id,
      title: ev.title,
      course: ev.course?.name || 'Global',
      courseId: ev.courseId,
      startTime: ev.startTime.toISOString(),
      endTime: ev.endTime.toISOString(),
      type: ev.type,
      status: ev.status,
      meetLink: ev.meetLink,
      description: ev.description,
    }))

    if (format === 'csv') {
      const headers = ['id', 'title', 'course', 'courseId', 'startTime', 'endTime', 'type', 'status', 'meetLink', 'description']
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(','))
      ]
      const csvString = csvRows.join('\n')
      
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="events-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({ events: data })
  } catch (error) {
    console.error('Export Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

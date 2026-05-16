import { prisma } from '@/lib/db'

const LOG_INTERVAL_MS = 10 * 60 * 1000
let lastCourseDiagnosticAt = 0

async function tableCount(tableName: string) {
  try {
    const safeTableName = tableName.replace(/"/g, '""')
    const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*)::int AS count FROM "${safeTableName}"`
    )
    return rows[0]?.count ?? 0
  } catch {
    return null
  }
}

export async function logCourseDataDiagnostics(params: {
  reason: string
  visibleCount?: number
  sessionRole?: string
  userId?: string
  requestedCourseId?: string
}) {
  const now = Date.now()
  if (now - lastCourseDiagnosticAt < LOG_INTERVAL_MS) return
  lastCourseDiagnosticAt = now

  try {
    const classCount = await tableCount('Class')
    const enrollmentCount = await tableCount('Enrollment')
    const topicCount = await tableCount('Topic')
    const lectureCount = await tableCount('Lecture')
    const materialCount = await tableCount('Material')
    const courseOfferingCount = await tableCount('CourseOffering')

    const recentClasses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        isGlobal: true,
        isDisabled: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    console.warn('[COURSE_DATA_DIAGNOSTIC]', JSON.stringify({
      ...params,
      classCount,
      enrollmentCount,
      topicCount,
      lectureCount,
      materialCount,
      courseOfferingCount,
      recentClasses,
      note: 'LMS courses are stored in the physical "Class" table. "courses" and "course_catalog" are legacy/store catalog tables and are not LMS course content.',
    }))
  } catch (error: any) {
    console.warn('[COURSE_DATA_DIAGNOSTIC_FAILED]', JSON.stringify({
      ...params,
      error: error?.message || String(error),
    }))
  }
}

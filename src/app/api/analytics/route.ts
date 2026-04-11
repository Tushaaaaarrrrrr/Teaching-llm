import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentIdParam = searchParams.get('studentId')
    const courseIdParam = searchParams.get('courseId')

    let accessibleCourseIdsForAdmin: string[] | null = null
    if (session.role === 'ADMIN') {
      accessibleCourseIdsForAdmin = await getAccessibleCourseIds(session.userId, session.role)
    }

    // --- Access Control for course filter ---
    // Managers can see all courses. Other roles can only see their assigned courses.
    if (courseIdParam && session.role !== 'MANAGER') {
      if (accessibleCourseIdsForAdmin !== null && !accessibleCourseIdsForAdmin.includes(courseIdParam)) {
        return NextResponse.json({ error: 'Access denied for this course' }, { status: 403 })
      }
    }

    // Build exam filter
    const examWhere: any = {}
    if (courseIdParam) {
      examWhere.courseId = courseIdParam
    } else if (session.role === 'ADMIN' && accessibleCourseIdsForAdmin) {
      examWhere.courseId = { in: accessibleCourseIdsForAdmin }
    }

    // --- Manager Overview Logic ---
    if (!studentIdParam && ['MANAGER', 'ADMIN'].includes(session.role)) {
      const allAttempts = await (prisma.examAttempt as any).findMany({
        where: { 
          submittedAt: { not: null },
          exam: examWhere,
        },
        include: { exam: { include: { questions: true } } },
        orderBy: { submittedAt: 'desc' },
      })

      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(new Set(allAttempts.map((attempt: any) => attempt.userId))) } },
        select: { id: true, name: true, email: true },
      })
      const userMap = new Map(users.map(user => [user.id, user]))

      const totalPresence = await (prisma.loginLog as any).count()
      
      const studentCountWhere: any = { role: 'STUDENT', isTerminated: false }
      if (courseIdParam || (session.role === 'ADMIN' && accessibleCourseIdsForAdmin)) {
        const filterCourseIds = courseIdParam ? [courseIdParam] : accessibleCourseIdsForAdmin
        // Count only students enrolled in this course
        const enrolledStudentIds = await prisma.enrollment.findMany({
          where: { courseId: { in: filterCourseIds! } },
          select: { userId: true },
        })
        studentCountWhere.id = { in: enrolledStudentIds.map(e => e.userId) }
      }
      const totalStudents = await (prisma.user as any).count({ where: studentCountWhere })

      // Calculate aggregate stats
      const studentMap: Record<string, { totalPercentage: number, count: number, name: string, email: string }> = {}
      allAttempts.forEach((a: any) => {
        if (!a.isEvaluated) return
        const totalPossible = a.exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)
        if (totalPossible === 0) return
        const percentage = (a.totalMarks / totalPossible) * 100
        const user = userMap.get(a.userId)
        
        if (!studentMap[a.userId]) {
          studentMap[a.userId] = { totalPercentage: 0, count: 0, name: user?.name || 'Unknown Student', email: user?.email || '' }
        }
        studentMap[a.userId].totalPercentage += percentage
        studentMap[a.userId].count += 1
      })

      const performers = Object.entries(studentMap).map(([id, s]) => ({
        id,
        name: s.name,
        email: s.email,
        average: (s.totalPercentage / s.count).toFixed(1)
      })).sort((a, b) => parseFloat(b.average) - parseFloat(a.average)).slice(0, 5)

      return NextResponse.json({
        type: 'MANAGER_OVERVIEW',
        courseId: courseIdParam || null,
        summary: {
          totalStudents,
          totalExams: allAttempts.length,
          avgPlatformScore: performers.length > 0 ? (performers.reduce((acc, p) => acc + parseFloat(p.average), 0) / performers.length).toFixed(1) : 0,
          totalCerts: allAttempts.filter((a: any) => a.isEvaluated && a.isPublished).length
        },
        topPerformers: performers,
        recentSubmissions: allAttempts.slice(0, 8).map((a: any) => ({
          student: userMap.get(a.userId)?.name || 'Unknown Student',
          exam: a.exam.title,
          date: a.submittedAt,
          status: a.isEvaluated ? 'Evaluated' : 'Pending'
        }))
      })
    }

    // --- Specific Student/Self Analytics ---
    let userId = session.userId
    if (studentIdParam && ['MANAGER', 'ADMIN'].includes(session.role)) {
      userId = studentIdParam
    }

    // 1. Attendance Data (LoginLogs)
    const logs = await (prisma.loginLog as any).findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' }
    })

    // 2. Exam Data - include ALL submitted attempts, optionally filtered by course
    const attemptWhere: any = {
      userId,
      submittedAt: { not: null },
    }
    if (courseIdParam) {
      attemptWhere.exam = { courseId: courseIdParam }
    }

    const attempts = await (prisma.examAttempt as any).findMany({
      where: attemptWhere,
      include: { exam: { include: { questions: true } } }
    })

    const examStats = attempts.map((a: any) => {
      const totalPossible = a.exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)
      const showScore = session.role === 'MANAGER' || a.isPublished
      
      return {
        id: a.id,
        title: a.exam.title,
        score: showScore ? a.totalMarks : null,
        total: totalPossible,
        percentage: (showScore && totalPossible > 0) ? ((a.totalMarks || 0) / totalPossible) * 100 : null,
        date: a.submittedAt,
        isEvaluated: a.isEvaluated,
        isPublished: a.isPublished
      }
    })

    const evaluatedExams = examStats.filter(s => s.isEvaluated && s.percentage !== null)
    const avgScore = evaluatedExams.length > 0 
      ? evaluatedExams.reduce((acc, s) => acc + (s.percentage as number), 0) / evaluatedExams.length 
      : 0

    // 3. Lecture Progress Data
    const progressWhere: any = { userId }
    if (courseIdParam) {
      progressWhere.content = { topic: { courseId: courseIdParam } }
    }

    const progressRecords = await prisma.lectureProgress.findMany({
      where: progressWhere,
      select: { status: true }
    })

    const contentCountWhere: any = {}
    if (courseIdParam) {
      contentCountWhere.topic = { courseId: courseIdParam }
    }
    const totalContent = await prisma.content.count({ where: contentCountWhere })

    const completedCount = progressRecords.filter(r => r.status === 'COMPLETED').length
    const rewatchCount = progressRecords.filter(r => r.status === 'REWATCH').length
    const neverSeenCount = Math.max(0, totalContent - completedCount - rewatchCount)

    return NextResponse.json({
      type: 'STUDENT_DETAIL',
      courseId: courseIdParam || null,
      attendance: logs,
      exams: examStats,
      progress: {
        completed: completedCount,
        rewatch: rewatchCount,
        neverSeen: neverSeenCount,
        total: totalContent,
        percentage: totalContent > 0 ? Math.round((completedCount / totalContent) * 100) : 0
      },
      summary: {
        attendanceCount: logs.length,
        averageExamScore: avgScore.toFixed(1),
        examsTaken: examStats.length
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentIdParam = searchParams.get('studentId')
    
    // --- Manager Overview Logic ---
    if (!studentIdParam && session.role === 'MANAGER') {
      const allAttempts = await (prisma.examAttempt as any).findMany({
        where: { submittedAt: { not: null } },
        include: { user: { select: { id: true, name: true, email: true } }, exam: { include: { questions: true } } },
        orderBy: { submittedAt: 'desc' },
      })

      const totalPresence = await (prisma.loginLog as any).count()
      const totalStudents = await (prisma.user as any).count({ where: { role: 'STUDENT' } })

      // Calculate aggregate stats
      const studentMap: Record<string, { totalPercentage: number, count: number, name: string, email: string }> = {}
      allAttempts.forEach((a: any) => {
        if (!a.isEvaluated) return
        const totalPossible = a.exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)
        if (totalPossible === 0) return
        const percentage = (a.totalMarks / totalPossible) * 100
        
        if (!studentMap[a.userId]) {
          studentMap[a.userId] = { totalPercentage: 0, count: 0, name: a.user.name, email: a.user.email }
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
        summary: {
          totalStudents,
          totalExams: allAttempts.length,
          avgPlatformScore: performers.length > 0 ? (performers.reduce((acc, p) => acc + parseFloat(p.average), 0) / performers.length).toFixed(1) : 0,
          totalCerts: allAttempts.filter((a: any) => a.isEvaluated && a.isPublished).length
        },
        topPerformers: performers,
        recentSubmissions: allAttempts.slice(0, 8).map((a: any) => ({
          student: a.user.name,
          exam: a.exam.title,
          date: a.submittedAt,
          status: a.isEvaluated ? 'Evaluated' : 'Pending'
        }))
      })
    }

    // --- Specific Student/Self Analytics ---
    let userId = session.userId
    if (studentIdParam && session.role === 'MANAGER') {
      userId = studentIdParam
    }

    // 1. Attendance Data (LoginLogs)
    const logs = await (prisma.loginLog as any).findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' }
    })

    // 2. Exam Data - include ALL submitted attempts
    const attempts = await (prisma.examAttempt as any).findMany({
      where: { 
        userId,
        submittedAt: { not: null } 
      },
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

    return NextResponse.json({
      type: 'STUDENT_DETAIL',
      attendance: logs,
      exams: examStats,
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

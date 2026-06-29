import { prisma } from '@/lib/db'

export async function checkAndAutoSubmitAttempts({ userId, examId }: { userId?: string; examId?: string }) {
  const now = new Date()

  // Find all active (unsubmitted) attempts matching our parameters
  const unsubmittedAttempts = await prisma.examAttempt.findMany({
    where: {
      submittedAt: null,
      ...(userId ? { userId } : {}),
      ...(examId ? { examId } : {})
    },
    include: {
      exam: {
        include: {
          questions: true
        }
      }
    }
  })

  for (const attempt of unsubmittedAttempts) {
    const exam = attempt.exam
    const timeLimitMs = exam.durationMinutes * 60 * 1000
    const examDurationExpired = now.getTime() > new Date(attempt.startedAt).getTime() + timeLimitMs
    const examDeadlinePassed = now > new Date(exam.expiresAt)

    if (examDurationExpired || examDeadlinePassed) {
      // Auto-submit this attempt
      try {
        const responses = await prisma.examResponse.findMany({
          where: { attemptId: attempt.id }
        })

        let totalMarks = 0
        let fullyAutoGraded = true

        for (const q of exam.questions) {
          const resp = responses.find(r => r.questionId === q.id)
          let isCorrect = false

          if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
            isCorrect = !!(resp && resp.answer === q.correctAnswer)
          } else if (q.type === 'MSQ') {
            try {
              const correctArr = JSON.parse(q.correctAnswer || '[]').sort()
              const studentArr = JSON.parse(resp?.answer || '[]').sort()
              isCorrect = JSON.stringify(correctArr) === JSON.stringify(studentArr)
            } catch {
              isCorrect = false
            }
          } else if (q.type === 'NAT') {
            if (resp && resp.answer && q.correctAnswer) {
              isCorrect = parseFloat(resp.answer) === parseFloat(q.correctAnswer)
            }
          } else {
            fullyAutoGraded = false
            continue // Skip grading for non-auto-gradable questions (e.g. subjective)
          }

          if (resp) {
            await prisma.examResponse.update({
              where: { id: resp.id },
              data: { marks: isCorrect ? q.marks : 0 }
            })
            if (isCorrect) totalMarks += q.marks
          }
        }

        // Set submission time to whichever elapsed first
        const durationEndTime = new Date(new Date(attempt.startedAt).getTime() + timeLimitMs)
        const submissionTime = examDeadlinePassed && new Date(exam.expiresAt) < durationEndTime
          ? new Date(exam.expiresAt)
          : durationEndTime

        await prisma.examAttempt.update({
          where: { id: attempt.id },
          data: {
            submittedAt: submissionTime < now ? submissionTime : now,
            totalMarks: fullyAutoGraded ? totalMarks : null,
            isEvaluated: fullyAutoGraded
          }
        })
      } catch (err) {
        console.error(`Failed to auto-submit attempt ${attempt.id}:`, err)
      }
    }
  }
}

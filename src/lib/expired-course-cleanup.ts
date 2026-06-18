import { queueExplicitGoogleGroupSyncJobs } from './google-group-sync'
import { isCourseExpired } from './course-state'

/**
 * Checks if a course is expired. If expired, queues Google Group REMOVE jobs
 * for all enrolled users (if group email is set) and deletes all of their enrollment records.
 */
export async function cleanupCourseEnrollmentsIfExpired(tx: any, courseId: string): Promise<boolean> {
  const course = await tx.course.findUnique({
    where: { id: courseId },
    select: { id: true, expiresAt: true, isDisabled: true, googleGroupEmail: true },
  })

  if (!course) return false

  // Check if course is expired
  if (!isCourseExpired(course)) {
    return false
  }

  // Find all enrollments
  const enrollments = await tx.enrollment.findMany({
    where: { courseId },
    include: {
      user: { select: { email: true } },
    },
  })

  if (enrollments.length === 0) {
    return false
  }

  console.log(`[Cleanup] Removing ${enrollments.length} users from expired course "${courseId}"`)

  // Queue Google Group REMOVE jobs if email is set
  if (course.googleGroupEmail) {
    const removeJobs = enrollments.map((e: any) => ({
      userEmail: e.user.email,
      courseId: courseId,
      groupEmail: course.googleGroupEmail,
      action: 'REMOVE' as const,
    }))
    await queueExplicitGoogleGroupSyncJobs(tx, removeJobs)
  }

  // Delete enrollments from database
  await tx.enrollment.deleteMany({
    where: { courseId },
  })

  return true
}

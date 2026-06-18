const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Running manual cleanup for expired courses...')
  const now = new Date()

  // Find all courses that are expired
  const expiredCourses = await prisma.course.findMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
    select: {
      id: true,
      name: true,
      googleGroupEmail: true,
    },
  })

  console.log(`Found ${expiredCourses.length} expired courses.`)

  let totalRemoved = 0

  for (const course of expiredCourses) {
    // Find enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: course.id },
      include: {
        user: { select: { email: true } },
      },
    })

    if (enrollments.length > 0) {
      console.log(`🧹 Cleaning up ${enrollments.length} enrollments for expired course "${course.name}" (${course.id})`)
      
      // Delete enrollments
      await prisma.enrollment.deleteMany({
        where: { courseId: course.id }
      })

      // Queue Google Group REMOVE jobs if email is set
      if (course.googleGroupEmail) {
        const jobs = enrollments.map(e => ({
          userEmail: e.user.email,
          courseId: course.id,
          groupEmail: course.googleGroupEmail,
          action: 'REMOVE'
        }))
        await prisma.groupSyncJob.createMany({
          data: jobs.map(job => ({
            userEmail: job.userEmail.toLowerCase(),
            courseId: job.courseId,
            groupEmail: job.groupEmail.toLowerCase(),
            action: job.action,
            status: 'PENDING'
          }))
        })
      }
      totalRemoved += enrollments.length
    }
  }

  console.log(`✅ Completed. Total enrollments removed: ${totalRemoved}`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

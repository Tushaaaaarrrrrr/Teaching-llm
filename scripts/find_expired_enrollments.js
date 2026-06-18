const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  console.log(`Checking for expired courses in the database... Current time: ${now.toISOString()}`)

  const expiredCourses = await prisma.course.findMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
    include: {
      enrollments: {
        include: {
          user: true
        }
      }
    }
  })

  console.log(`Found ${expiredCourses.length} expired courses.`)

  for (const course of expiredCourses) {
    console.log(`\nCourse: "${course.name}" (${course.id})`)
    console.log(`Expiry Date: ${course.expiresAt ? course.expiresAt.toISOString() : 'N/A'}`)
    console.log(`Active enrollments count: ${course.enrollments.length}`)
    if (course.enrollments.length > 0) {
      console.log('Enrollments:')
      course.enrollments.forEach(e => {
        console.log(`  - User: ${e.user.name} (${e.user.email})`)
      })
    }
  }

  await prisma.$disconnect()
}

main().catch(console.error)

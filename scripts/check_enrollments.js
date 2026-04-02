const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Checking Recent Activity Logs ---')
  const logs = await prisma.activityLog.findMany({
    where: {
      actionType: 'EXTERNAL_ENROLLMENT',
      timestamp: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  })

  if (logs.length === 0) {
    console.log('No EXTERNAL_ENROLLMENT activity logs found for today.')
  } else {
    console.log(`Found ${logs.length} external enrollment logs today:`)
    logs.forEach(log => {
      console.log(`[${log.timestamp.toISOString()}] User: ${log.userName} (${log.user?.email}) - ${log.actionDescription}`)
    })
  }

  console.log('\n--- Checking Recent Enrollments ---')
  const enrollments = await prisma.enrollment.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      },
      course: {
        select: {
          name: true
        }
      }
    }
  })

  if (enrollments.length === 0) {
    console.log('No recent enrollments found.')
  } else {
    enrollments.forEach(en => {
      console.log(`[${en.createdAt.toISOString()}] User: ${en.user.name} (${en.user.email}) Enrolled in: ${en.course.name}`)
    })
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

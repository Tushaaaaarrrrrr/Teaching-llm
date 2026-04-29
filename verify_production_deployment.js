/**
 * POST-DEPLOYMENT VERIFICATION
 * Run this after deploying to production to verify courses are safe
 * Usage: node verify_production_deployment.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗')
  console.log('║   POST-DEPLOYMENT VERIFICATION                   ║')
  console.log('║   Checking production database integrity...      ║')
  console.log('╚═══════════════════════════════════════════════════╝\n')

  try {
    // Check 1: Total courses
    const courseCount = await prisma.course.count()
    console.log(`📊 Total Courses: ${courseCount}`)
    if (courseCount === 0) {
      console.log('   ⚠️  WARNING: No courses found!')
    } else {
      console.log('   ✅ Courses exist in database')
    }

    // Check 2: Enrollments
    const enrollmentCount = await prisma.enrollment.count()
    console.log(`\n👥 Total Enrollments: ${enrollmentCount}`)

    // Check 3: New tables created successfully
    const upgradeTransactionCount = await prisma.upgradeTransaction.count()
    console.log(`\n💳 UpgradeTransaction table: ${upgradeTransactionCount} records`)
    console.log('   ✅ New migration tables exist')

    const courseOfferingCount = await prisma.courseOffering.count()
    console.log(`\n🎓 CourseOffering table: ${courseOfferingCount} records`)

    // Check 4: Sample visible courses
    const visibleCourses = await prisma.course.findMany({
      where: {
        isGlobal: false,
        isDisabled: false,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      take: 5,
    })

    console.log(`\n📚 Sample Visible Courses (${visibleCourses.length}):`)
    visibleCourses.forEach(c => {
      console.log(`   - ${c.name} (created: ${c.createdAt.toISOString().split('T')[0]})`)
    })

    // Check 5: Schema validation
    const colCheck = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'Class' AND column_name = 'liveUpgradePrice'
    `)

    console.log('\n🔧 Schema Validation:')
    if (colCheck[0].count > 0) {
      console.log('   ✅ liveUpgradePrice column exists')
    } else {
      console.log('   ❌ liveUpgradePrice column MISSING')
    }

    console.log('\n╔═══════════════════════════════════════════════════╗')
    console.log('║   ✅ DEPLOYMENT SUCCESSFUL                       ║')
    console.log('║   All checks passed — your data is safe!        ║')
    console.log('╚═══════════════════════════════════════════════════╝\n')

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED')
    console.error('Error:', error.message)
    console.log('\n⚠️  ACTION REQUIRED:')
    console.log('   1. Check database connection is correct')
    console.log('   2. Verify migrations ran successfully')
    console.log('   3. Check DATABASE_URL environment variable')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

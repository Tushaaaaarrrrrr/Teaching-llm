/**
 * Check course visibility status — helps debug why courses disappeared
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗')
  console.log('║   COURSE STATUS CHECK                            ║')
  console.log('╚═══════════════════════════════════════════════════╝\n')

  // Total courses
  const total = await prisma.course.findMany({
    select: { id: true, name: true, isGlobal: true, isDisabled: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`📊 TOTAL COURSES IN DATABASE: ${total.length}\n`)

  if (total.length === 0) {
    console.log('  ⚠️  NO COURSES FOUND IN DATABASE!')
    console.log('  This means courses were actually deleted, not just hidden.')
    console.log('  Check your backups or migrations.')
  } else {
    console.log('COURSE BREAKDOWN:')
    const global = total.filter(c => c.isGlobal)
    const disabled = total.filter(c => c.isDisabled)
    const visible = total.filter(c => !c.isGlobal && !c.isDisabled)

    console.log(`  ✅ Visible (isGlobal=false, isDisabled=false): ${visible.length}`)
    console.log(`  🚫 Hidden as Global (isGlobal=true): ${global.length}`)
    console.log(`  ⛔ Hidden as Disabled (isDisabled=true): ${disabled.length}`)

    if (visible.length > 0) {
      console.log(`\n  VISIBLE COURSES:`)
      visible.forEach(c => {
        console.log(`    - ${c.name} (${c.id})`)
      })
    }

    if (global.length > 0) {
      console.log(`\n  ⚠️  HIDDEN GLOBAL COURSES (These are the "missing" courses):`)
      global.forEach(c => {
        console.log(`    - ${c.name} (${c.id})`)
      })
      console.log(`\n  FIX: Run: UPDATE "Class" SET "isGlobal" = false WHERE "isGlobal" = true;`)
    }

    if (disabled.length > 0) {
      console.log(`\n  ⛔ DISABLED COURSES:`)
      disabled.forEach(c => {
        console.log(`    - ${c.name} (${c.id})`)
      })
      console.log(`\n  FIX: Run: UPDATE "Class" SET "isDisabled" = false WHERE "isDisabled" = true;`)
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════╗')
  console.log('║   END OF REPORT                                   ║')
  console.log('╚═══════════════════════════════════════════════════╝')
}

main()
  .catch(e => { console.error('❌ ERROR:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())

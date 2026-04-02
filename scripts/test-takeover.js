const { processGoogleGroupSyncJobs } = require('../src/lib/google-group-sync')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Phase 1: Verify current stuck lock ---')
  const before = await prisma.groupSyncLock.findUnique({ where: { id: 'singleton' } })
  console.log('Status before processing:', JSON.stringify(before, null, 2))

  console.log('\n--- Phase 2: Run processing ---')
  const result = await processGoogleGroupSyncJobs()
  console.log('Process Result:', JSON.stringify(result, null, 2))

  console.log('\n--- Phase 3: Verify lock was update (Stole/Fresh) ---')
  const after = await prisma.groupSyncLock.findUnique({ where: { id: 'singleton' } })
  console.log('Status after processing:', JSON.stringify(after, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const lock = await prisma.groupSyncLock.update({
    where: { id: 'singleton' },
    data: {
      isProcessing: true,
      lockedAt: tenMinutesAgo,
    },
  })
  console.log('Stuck Lock Simulated:', JSON.stringify(lock, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const lock = await prisma.groupSyncLock.findUnique({
    where: { id: 'singleton' },
  })
  console.log('Current Lock Status:', JSON.stringify(lock, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())

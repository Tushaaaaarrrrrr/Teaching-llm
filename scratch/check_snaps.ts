import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const snaps = await prisma.analyticsSnapshot.findMany({
    orderBy: { date: 'desc' },
    limit: 10
  })
  console.log(JSON.stringify(snaps, null, 2))
}
main().finally(() => prisma.$disconnect())

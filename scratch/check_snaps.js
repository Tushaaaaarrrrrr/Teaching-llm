const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const snaps = await prisma.analyticsSnapshot.findMany({
    orderBy: { date: 'desc' },
    take: 10
  })
  console.log(JSON.stringify(snaps, null, 2))
}
main().finally(() => prisma.$disconnect())

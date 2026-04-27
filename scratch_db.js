const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "enableDetailedLogs" BOOLEAN NOT NULL DEFAULT false;')
  console.log('Column added successfully')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())

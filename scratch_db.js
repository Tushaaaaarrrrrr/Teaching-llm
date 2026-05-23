const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { email: 'student@teacherai.com' }
  })
  console.log('Users found:', users)
}

main().finally(() => prisma.$disconnect())

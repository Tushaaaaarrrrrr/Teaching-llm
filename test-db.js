const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.user.count();
  console.log('Users:', c);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

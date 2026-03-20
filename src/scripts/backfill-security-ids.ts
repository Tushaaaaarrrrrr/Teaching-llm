import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { securityNumber: null }
  });

  console.log(`Found ${users.length} users without securityNumber.`);

  for (const user of users) {
    const securityNumber = 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase();
    await prisma.user.update({
      where: { id: user.id },
      data: { securityNumber }
    });
    console.log(`Updated user ${user.email} with securityNumber ${securityNumber}`);
  }

  console.log('Backfill complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

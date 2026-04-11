const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HelpCardConfig" (
        "id" TEXT NOT NULL DEFAULT 'singleton',
        "title" TEXT NOT NULL DEFAULT 'Need Help?',
        "description" TEXT NOT NULL DEFAULT 'Need more courses or assistance?',
        "redirectUrl" TEXT NOT NULL DEFAULT 'mailto:support@example.com',
        "isEnabled" BOOLEAN NOT NULL DEFAULT true,

        CONSTRAINT "HelpCardConfig_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log("SQL executed");
}
main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Creating LectureProgress table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "public"."LectureProgress" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "contentId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
          "updatedAt" TIMESTAMP(3) NOT NULL,

          CONSTRAINT "LectureProgress_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log("Creating indexes...");
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LectureProgress_userId_idx" ON "LectureProgress"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LectureProgress_contentId_idx" ON "LectureProgress"("contentId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "LectureProgress_userId_contentId_key" ON "LectureProgress"("userId", "contentId");`);

    console.log("Creating foreign keys...");
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "LectureProgress" 
        ADD CONSTRAINT "LectureProgress_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch (e) { console.log('Foreign key userId might already exist'); }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "LectureProgress" 
        ADD CONSTRAINT "LectureProgress_contentId_fkey" 
        FOREIGN KEY ("contentId") REFERENCES "Content"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch (e) { console.log('Foreign key contentId might already exist'); }

    console.log("Success.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

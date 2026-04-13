// Backfill lastMessageAt for all courses that have community messages.
// Run ONCE after schema migration: node scripts/backfill_last_message_at.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the latest non-deleted message per course
  const courses = await prisma.course.findMany({
    where: { isGlobal: false },
    select: { id: true, name: true },
  });

  let updated = 0;
  for (const course of courses) {
    const latestMsg = await prisma.communityMessage.findFirst({
      where: { courseId: course.id, isDeleted: false, isSystemDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latestMsg) {
      await prisma.course.update({
        where: { id: course.id },
        data: { lastMessageAt: latestMsg.createdAt },
      });
      updated++;
      console.log(`✓ ${course.name} → ${latestMsg.createdAt.toISOString()}`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${courses.length} courses.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to cleanup stale Activity Logs from the database.
 * Default: Deletes logs older than 90 days.
 * 
 * Usage: npm run db:cleanup
 */
async function main() {
  const DAYS_TO_KEEP = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);

  console.log(`\n[Maintenance] Activity Log Cleanup`);
  console.log(`----------------------------------`);
  console.log(`Target: Logs older than ${DAYS_TO_KEEP} days`);
  console.log(`Cutoff Date: ${cutoffDate.toLocaleString()}`);

  try {
    // 1. Get count of logs to be deleted
    const count = await (prisma as any).activityLog.count({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    if (count === 0) {
      console.log(`Result: No stale logs found. Database is healthy.\n`);
      return;
    }

    console.log(`Status: Found ${count} logs to remove.`);

    // 2. Perform deletion
    const result = await (prisma as any).activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Success: Deleted ${result.count} stale activity logs.`);
    console.log(`Status: Database optimization complete.\n`);

  } catch (error) {
    console.error(`Error: Failed to cleanup logs:`, error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

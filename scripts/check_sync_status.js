const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.groupSyncJob.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Job counts by status:');
  console.log(JSON.stringify(counts, null, 2));

  const failedJobs = await prisma.groupSyncJob.findMany({
    where: { status: 'FAILED' },
    take: 5
  });
  if (failedJobs.length > 0) {
    console.log('\nSample Failed Jobs:');
    console.log(JSON.stringify(failedJobs, null, 2));
  }

  const processingJobs = await prisma.groupSyncJob.findMany({
    where: { status: 'PROCESSING' },
    take: 5
  });
  if (processingJobs.length > 0) {
    console.log('\nJobs stuck in PROCESSING:');
    console.log(JSON.stringify(processingJobs, null, 2));
  }

  const lock = await prisma.groupSyncLock.findUnique({
    where: { id: 'singleton' }
  });
  console.log('\nSync Lock Status:');
  console.log(JSON.stringify(lock, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

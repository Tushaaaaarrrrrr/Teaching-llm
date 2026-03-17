import { prisma } from '../lib/db';

async function cleanupMessages() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  console.log(`Starting cleanup for messages older than ${fifteenDaysAgo.toISOString()}`);

  try {
    // Cleanup CommunityMessages
    const communityResult = await prisma.communityMessage.updateMany({
      where: {
        createdAt: { lt: fifteenDaysAgo },
        isSystemDeleted: false,
      },
      data: {
        isSystemDeleted: true,
        deletedAt: new Date(),
        content: '[System Auto-Deleted: 15-day limit reached]',
      },
    });

    // Cleanup ChatMessages
    const chatResult = await prisma.chatMessage.updateMany({
      where: {
        createdAt: { lt: fifteenDaysAgo },
        isSystemDeleted: false,
      },
      data: {
        isSystemDeleted: true,
        deletedAt: new Date(),
        content: '[System Auto-Deleted: 15-day limit reached]',
      },
    });

    console.log(`Cleanup complete.`);
    console.log(`- CommunityMessages marked: ${communityResult.count}`);
    console.log(`- ChatMessages marked: ${chatResult.count}`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupMessages();

import { prisma } from '../lib/db';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function extractStoragePath(publicUrl: string): string | null {
  const match = publicUrl.match(/\/object\/public\/lms-uploads\/(.+)$/);
  return match ? match[1] : null;
}

async function cleanupMessages() {
  console.log('Message cleanup is disabled by user request. Skipping CommunityMessage and ChatMessage database updates.');

  try {
    // Cleanup CommunityMessages - SKIPPED
    const communityResult = { count: 0 };

    // Cleanup ChatMessages - SKIPPED
    const chatResult = { count: 0 };

    console.log(`Message cleanup complete.`);
    console.log(`- CommunityMessages marked: ${communityResult.count}`);
    console.log(`- ChatMessages marked: ${chatResult.count}`);

    // ── Chat Image Cleanup (30 days) ────────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const supabase = getSupabaseAdmin();
    let imageDeleteCount = 0;

    if (supabase) {
      console.log(`\nStarting image cleanup for images older than ${thirtyDaysAgo.toISOString()}`);

      // Community message images
      const commImages = await prisma.communityMessage.findMany({
        where: { imageUrl: { not: null }, createdAt: { lt: thirtyDaysAgo } },
        select: { id: true, imageUrl: true },
      });
      for (const msg of commImages) {
        if (msg.imageUrl) {
          const path = extractStoragePath(msg.imageUrl);
          if (path) await supabase.storage.from('lms-uploads').remove([path]);
          await prisma.communityMessage.update({ where: { id: msg.id }, data: { imageUrl: null } });
          imageDeleteCount++;
        }
      }

      // Chat message images
      const chatImages = await prisma.chatMessage.findMany({
        where: { imageUrl: { not: null }, createdAt: { lt: thirtyDaysAgo } },
        select: { id: true, imageUrl: true },
      });
      for (const msg of chatImages) {
        if (msg.imageUrl) {
          const path = extractStoragePath(msg.imageUrl);
          if (path) await supabase.storage.from('lms-uploads').remove([path]);
          await prisma.chatMessage.update({ where: { id: msg.id }, data: { imageUrl: null } });
          imageDeleteCount++;
        }
      }

      // Ticket reply images
      const replyImages = await prisma.ticketReply.findMany({
        where: { imageUrl: { not: null }, createdAt: { lt: thirtyDaysAgo } },
        select: { id: true, imageUrl: true },
      });
      for (const reply of replyImages) {
        if (reply.imageUrl) {
          const path = extractStoragePath(reply.imageUrl);
          if (path) await supabase.storage.from('lms-uploads').remove([path]);
          await prisma.ticketReply.update({ where: { id: reply.id }, data: { imageUrl: null } });
          imageDeleteCount++;
        }
      }

      console.log(`Image cleanup complete: ${imageDeleteCount} images deleted from storage.`);
    } else {
      console.log('⚠️ Supabase not configured — skipping image cleanup.');
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupMessages();


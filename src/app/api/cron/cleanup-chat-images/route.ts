import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

function extractStoragePath(publicUrl: string): string | null {
  // Extract the path after /object/public/lms-uploads/
  const match = publicUrl.match(/\/object\/public\/lms-uploads\/(.+)$/)
  return match ? match[1] : null
}

export async function GET(_request: NextRequest) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const supabase = getSupabaseAdmin()
    let deletedCount = 0

    // 1. Cleanup CommunityMessage images
    const communityMsgs = await prisma.communityMessage.findMany({
      where: {
        imageUrl: { not: null },
        createdAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, imageUrl: true },
    })

    for (const msg of communityMsgs) {
      if (msg.imageUrl) {
        const path = extractStoragePath(msg.imageUrl)
        if (path) {
          await supabase.storage.from('lms-uploads').remove([path])
        }
        await prisma.communityMessage.update({
          where: { id: msg.id },
          data: { imageUrl: null },
        })
        deletedCount++
      }
    }

    // 2. Cleanup ChatMessage images
    const chatMsgs = await prisma.chatMessage.findMany({
      where: {
        imageUrl: { not: null },
        createdAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, imageUrl: true },
    })

    for (const msg of chatMsgs) {
      if (msg.imageUrl) {
        const path = extractStoragePath(msg.imageUrl)
        if (path) {
          await supabase.storage.from('lms-uploads').remove([path])
        }
        await prisma.chatMessage.update({
          where: { id: msg.id },
          data: { imageUrl: null },
        })
        deletedCount++
      }
    }

    // 3. Cleanup TicketReply images
    const ticketReplies = await prisma.ticketReply.findMany({
      where: {
        imageUrl: { not: null },
        createdAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, imageUrl: true },
    })

    for (const reply of ticketReplies) {
      if (reply.imageUrl) {
        const path = extractStoragePath(reply.imageUrl)
        if (path) {
          await supabase.storage.from('lms-uploads').remove([path])
        }
        await prisma.ticketReply.update({
          where: { id: reply.id },
          data: { imageUrl: null },
        })
        deletedCount++
      }
    }

    console.log(`[CRON] Chat image cleanup: removed ${deletedCount} expired images`)
    return NextResponse.json({ success: true, deletedCount })
  } catch (error) {
    console.error('[CRON] Chat image cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

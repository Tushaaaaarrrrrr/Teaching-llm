import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function extractStoragePath(publicUrl: string): string | null {
  const match = publicUrl.match(/\/object\/public\/lms-uploads\/(.+)$/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch (e) {
    return match[1]
  }
}

export async function autoCleanupCommunityAttachments() {
  console.log('[Community Cleanup] Starting cleanup of attachments older than 100 days...')
  
  const hundredDaysAgo = new Date()
  hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100)

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('[Community Cleanup] Supabase is not configured. Skipping file deletions.')
    return { success: false, error: 'Supabase credentials missing' }
  }

  try {
    // Find all community messages with an attachment (imageUrl is not null) older than 100 days
    const staleMessages = await prisma.communityMessage.findMany({
      where: {
        imageUrl: {
          not: null
        },
        createdAt: {
          lt: hundredDaysAgo
        }
      },
      select: {
        id: true,
        imageUrl: true,
        courseId: true
      }
    })

    if (staleMessages.length === 0) {
      console.log('[Community Cleanup] No stale attachments found.')
      return { success: true, count: 0 }
    }

    console.log(`[Community Cleanup] Found ${staleMessages.length} stale community attachments to delete.`)
    
    let deletedCount = 0
    // Process in chunks/loops to handle supabase storage API gracefully
    for (const msg of staleMessages) {
      if (!msg.imageUrl) continue

      const path = extractStoragePath(msg.imageUrl)
      if (path) {
        try {
          const { error: removeError } = await supabase.storage
            .from('lms-uploads')
            .remove([path])
          
          if (removeError) {
            console.error(`[Community Cleanup] Error removing file ${path} from storage:`, removeError)
          }
        } catch (storageErr) {
          console.error(`[Community Cleanup] Supabase storage exception for ${path}:`, storageErr)
        }
      }

      // Update database message: set imageUrl to null
      await prisma.communityMessage.update({
        where: { id: msg.id },
        data: { imageUrl: null }
      })

      deletedCount++
    }

    // Log the maintenance action in ActivityLog
    await prisma.activityLog.create({
      data: {
        userId: 'SYSTEM',
        userName: 'System Cleanup',
        userRole: 'SYSTEM',
        actionType: 'COMMUNITY_CLEANUP_SUCCESS',
        actionDescription: `Automatically cleaned up ${deletedCount} community photos & documents older than 100 days.`,
        moduleName: 'Community',
        priority: 0,
        isFailure: false
      }
    }).catch(e => console.error('[Community Cleanup] Failed to write cleanup activity log:', e))

    console.log(`[Community Cleanup] Successfully processed & nullified ${deletedCount} attachments.`)
    return { success: true, count: deletedCount }

  } catch (error) {
    console.error('[Community Cleanup] Error running auto-cleanup:', error)
    
    // Log failure
    await prisma.activityLog.create({
      data: {
        userId: 'SYSTEM',
        userName: 'System Cleanup',
        userRole: 'SYSTEM',
        actionType: 'COMMUNITY_CLEANUP_FAILURE',
        actionDescription: `Failed to auto cleanup community attachments: ${error instanceof Error ? error.message : String(error)}`,
        moduleName: 'Community',
        priority: 1,
        isFailure: true
      }
    }).catch(e => console.error('[Community Cleanup] Failed to write cleanup failure activity log:', e))

    return { success: false, error }
  }
}

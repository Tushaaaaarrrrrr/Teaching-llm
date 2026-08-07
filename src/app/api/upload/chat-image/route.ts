import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const MAX_IMAGES_PER_DAY = 30

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    // Any authenticated user can upload chat images
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: max 30 images per day per user
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const [commCount, chatCount, replyCount] = await Promise.all([
      prisma.communityMessage.count({ where: { senderId: session.userId, imageUrl: { not: null }, createdAt: { gte: todayStart } } }),
      prisma.chatMessage.count({ where: { senderId: session.userId, imageUrl: { not: null }, createdAt: { gte: todayStart } } }),
      prisma.ticketReply.count({ where: { senderId: session.userId, imageUrl: { not: null }, createdAt: { gte: todayStart } } }),
    ])
    const todayTotal = commCount + chatCount + replyCount
    if (todayTotal >= MAX_IMAGES_PER_DAY) {
      return NextResponse.json({ error: `Daily limit reached. You can upload max ${MAX_IMAGES_PER_DAY} images per day.` }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Strict validation: Max 20MB for chat attachments
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 20MB for chat attachments.' }, { status: 400 })
    }

    const originalExt = (file.name.split('.').pop() || '').toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'zip']
    const normalizedExt = originalExt === 'jpeg' ? 'jpg' : originalExt

    if (!allowedExtensions.includes(originalExt)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, ZIP.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const secureId = crypto.randomUUID()
    const filename = `${secureId}.${normalizedExt}`

    const supabase = getSupabaseAdmin()
    const storagePath = `chat-files/${filename}`

    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      pdf: 'application/pdf',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      zip: 'application/zip',
    }

    const { error: uploadError } = await supabase.storage
      .from('lms-uploads')
      .upload(storagePath, buffer, {
        contentType: contentTypeMap[normalizedExt] || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase chat file upload error:', uploadError)
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('lms-uploads')
      .getPublicUrl(storagePath)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error('Error uploading chat image:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

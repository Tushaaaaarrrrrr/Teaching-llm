import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Strict validation: Max 5MB for chat images
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB for chat images.' }, { status: 400 })
    }

    const originalExt = (file.name.split('.').pop() || '').toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']
    const normalizedExt = originalExt === 'jpeg' ? 'jpg' : originalExt

    if (!allowedExtensions.includes(originalExt)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validate magic bytes for images
    const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
    const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    
    if (!isJpg && !isPng && !isWebp) {
      return NextResponse.json({ error: 'File content does not match an allowed image type.' }, { status: 400 })
    }

    const secureId = crypto.randomUUID()
    const filename = `${secureId}.${normalizedExt}`

    const supabase = getSupabaseAdmin()
    const storagePath = `chat-images/${filename}`

    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    }

    const { error: uploadError } = await supabase.storage
      .from('lms-uploads')
      .upload(storagePath, buffer, {
        contentType: contentTypeMap[normalizedExt] || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase chat image upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
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

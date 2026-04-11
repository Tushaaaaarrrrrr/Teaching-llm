import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { checkMagicBytes } from '@/lib/validation'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Server-side Supabase client using service role key (bypasses RLS for uploads)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Strict validation: Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validate by magic bytes when possible, with a controlled extension fallback
    const detectedExt = await checkMagicBytes(buffer)
    const originalExt = (file.name.split('.').pop() || '').toLowerCase()
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'zip']
    const finalExt = detectedExt || originalExt

    if (!finalExt || !allowedExtensions.includes(finalExt)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPG, PNG, PPT, PPTX, DOC, DOCX, XLS, XLSX, ZIP.' }, { status: 400 })
    }

    const secureId = crypto.randomUUID()
    const normalizedExt = finalExt === 'jpeg' ? 'jpg' : finalExt
    const filename = `${secureId}.${normalizedExt}`

    const type = formData.get('type') as string || 'announcements'
    const allowedTypes = ['announcements', 'exams', 'updates', 'materials']
    const finalType = allowedTypes.includes(type) ? type : 'announcements'

    // Upload to Supabase Storage (bucket: lms-uploads, path: {type}/{filename})
    const supabase = getSupabaseAdmin()
    const storagePath = `${finalType}/${filename}`

    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
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
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 })
    }

    // Get the permanent public URL
    const { data: urlData } = supabase.storage
      .from('lms-uploads')
      .getPublicUrl(storagePath)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

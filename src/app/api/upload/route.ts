import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { checkMagicBytes } from '@/lib/validation'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

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

    // Strict validation: Magic Bytes (PDF, JPG, PNG only)
    const detectedExt = await checkMagicBytes(buffer)
    const allowedExtensions = ['pdf', 'jpg', 'png']
    
    if (!detectedExt || !allowedExtensions.includes(detectedExt)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }, { status: 400 })
    }

    const secureId = crypto.randomUUID()
    const filename = `${secureId}.${detectedExt}`
    
    const type = formData.get('type') as string || 'announcements'
    const allowedTypes = ['announcements', 'exams', 'updates']
    const finalType = allowedTypes.includes(type) ? type : 'announcements'

    const uploadDir = path.join(process.cwd(), 'storage', finalType)
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {}

    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, buffer)

    const fileUrl = `/api/files/${finalType}/${filename}`

    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

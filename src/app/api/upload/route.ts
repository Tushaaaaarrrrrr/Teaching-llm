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

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 2MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const detectedExt = await checkMagicBytes(buffer)
    if (!detectedExt) {
      return NextResponse.json({ error: 'Invalid file content' }, { status: 400 })
    }

    const secureId = crypto.randomUUID()
    const filename = `${secureId}.${detectedExt}`
    
    const type = formData.get('type') as string || 'announcements'
    const allowedTypes = ['announcements', 'exams']
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

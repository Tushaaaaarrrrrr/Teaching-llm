import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    
    // Basic path traversal protection (id should just be a filename)
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'storage', 'avatars', id)

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    const buffer = await readFile(filePath)
    
    // Determine content type based on extension
    const ext = id.split('.').pop()?.toLowerCase()
    let contentType = 'image/png'
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'
    if (ext === 'webp') contentType = 'image/webp'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving avatar:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

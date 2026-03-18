import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    const { type, id } = params
    
    // Validate type to prevent traversing
    const allowedTypes = ['avatars', 'announcements', 'exams']
    if (!allowedTypes.includes(type)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const storageDir = path.join(process.cwd(), 'storage', type)
    const filePath = path.join(storageDir, id)

    try {
      const data = await readFile(filePath)
      
      const ext = path.extname(id).toLowerCase()
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp'
      }

      return new NextResponse(data, {
        headers: {
          'Content-Type': contentTypeMap[ext] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      })
    } catch {
      return new NextResponse('Not Found', { status: 404 })
    }
  } catch (error) {
    console.error('Error serving file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

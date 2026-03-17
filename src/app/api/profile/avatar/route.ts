import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkMagicBytes } from '@/lib/validation'
import { writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Size limit: 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 2MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Magic Byte Validation
    const detectedExt = await checkMagicBytes(buffer)
    if (!detectedExt) {
      return NextResponse.json({ error: 'Invalid file content. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 })
    }

    // Filename Randomization
    const secureId = crypto.randomUUID()
    const filename = `${secureId}.${detectedExt}`
    
    // Store in private directory
    const uploadDir = path.join(process.cwd(), 'storage', 'avatars')
    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, buffer)

    // Store secure API URL in database
    const avatarUrl = `/api/avatars/${filename}`

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.AVATAR_UPLOADED,
      actionDescription: `${session.name} uploaded a secure avatar`,
      moduleName: MODULE.PROFILE,
      targetId: session.userId
    })

    return NextResponse.json({ user, avatar: avatarUrl })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

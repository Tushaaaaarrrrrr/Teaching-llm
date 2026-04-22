import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url) throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!key) throw new Error('Environment variable SUPABASE_SERVICE_ROLE_KEY is not set')
  
  return createClient(url, key)
}

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

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'png'
    const filename = `${session.userId}-${Date.now()}.${ext}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const supabase = getSupabaseAdmin()
    const storagePath = `avatars/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('lms-uploads')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload avatar to storage' }, { status: 500 })
    }

    // Get the permanent public URL
    const { data: urlData } = supabase.storage
      .from('lms-uploads')
      .getPublicUrl(storagePath)

    const avatarUrl = urlData.publicUrl

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
      actionDescription: `${session.name} uploaded a new avatar`,
      moduleName: MODULE.PROFILE,
    })

    return NextResponse.json({ user, avatar: avatarUrl })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { avatar: null },
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
      actionDescription: `${session.name} removed their avatar`,
      moduleName: MODULE.PROFILE,
    })

    return NextResponse.json({ user, avatar: null })
  } catch (error) {
    console.error('Error removing avatar:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

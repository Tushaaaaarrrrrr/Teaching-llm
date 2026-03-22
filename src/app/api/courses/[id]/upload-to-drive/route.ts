import { NextRequest, NextResponse } from 'next/server'
import { getFullSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getFullSession()
    if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: courseId } = await params

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { googleDriveFolderId: true }
    })

    if (!course?.googleDriveFolderId) {
      return NextResponse.json({ error: 'Google Drive Folder not configured for this course' }, { status: 400 })
    }

    const cred = await prisma.googleCredential.findFirst({
      where: { 
        OR: [
          { userId: session.userId },
          { user: { role: 'MANAGER' } } // Fallback to any manager's cred if admin doesn't have one
        ]
      }
    })

    if (!cred) {
      return NextResponse.json({ error: 'Google account not linked. Please link your Google account in Settings.' }, { status: 400 })
    }

    let accessToken = cred.accessToken

    // Refresh token if expired
    if (new Date() > cred.expiresAt && cred.refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID || '990282572765-bn1ls79tuhpa589eiici5r9mr6c98c8h.apps.googleusercontent.com'
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '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'
      
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: cred.refreshToken,
          grant_type: 'refresh_token'
        })
      })
      
      const tokenData = await tokenRes.json()
      if (tokenData.access_token) {
        accessToken = tokenData.access_token
        await prisma.googleCredential.update({
          where: { id: cred.id },
          data: {
            accessToken,
            expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
          }
        })
      }
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Google Drive Multipart Upload
    const metadata = {
      name: file.name,
      parents: [course.googleDriveFolderId]
    }

    const multiPartFormData = new FormData()
    multiPartFormData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    multiPartFormData.append('file', file)

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: multiPartFormData
    })

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      console.error('Google Drive Upload Error:', errorText)
      return NextResponse.json({ error: 'Failed to upload to Google Drive' }, { status: 500 })
    }

    const uploadData = await uploadRes.json()

    // Optionally: Set permissions to anyone with link can view
    await fetch(`https://www.googleapis.com/api/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    })

    return NextResponse.json({ 
      fileId: uploadData.id, 
      url: uploadData.webViewLink 
    })

  } catch (error) {
    console.error('Upload to Drive error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

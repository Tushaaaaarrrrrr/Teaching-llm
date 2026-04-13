import { NextResponse } from 'next/server'
import { google } from 'googleapis'

const TEST_GROUP_EMAIL = 're-attempt-26f1@genziitian.org'
const TEST_MEMBER_EMAIL = 'admin@genziitian.org'

export async function GET() {
  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n")
    const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL

    if (!serviceAccountEmail || !privateKey || !adminEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required Google Workspace environment variables',
          details: {
            hasServiceAccountEmail: !!serviceAccountEmail,
            hasPrivateKey: !!privateKey,
            hasAdminEmail: !!adminEmail,
          },
        },
        { status: 500 }
      )
    }

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      subject: adminEmail,
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.group',
        'https://www.googleapis.com/auth/admin.directory.group.member',
      ],
    })

    const admin = google.admin({ version: 'directory_v1', auth })

    await admin.members.insert({
      groupKey: TEST_GROUP_EMAIL,
      requestBody: {
        email: TEST_MEMBER_EMAIL,
        role: 'MEMBER',
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Unknown Google Groups test error',
        details: err?.response?.data || null,
      },
      { status: 500 }
    )
  }
}

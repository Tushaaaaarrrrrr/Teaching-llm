import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contacts, source } = body

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No contacts provided' })
    }

    // Limit batch size to 5000 contacts per request
    const contactBatch = contacts.slice(0, 5000)
    const sanitizedSource = source === 'CAPACITOR_APP' ? 'CAPACITOR_APP' : 'FLUTTER_APP'

    let insertedOrUpdated = 0

    // Upsert contacts in chunks to avoid single query limits
    const chunkSize = 200
    for (let i = 0; i < contactBatch.length; i += chunkSize) {
      const chunk = contactBatch.slice(i, i + chunkSize)
      
      const operations = chunk
        .map((c: any) => {
          const rawPhone = String(c.phone || c.phoneNumber || '').trim()
          // Clean phone: keep digits and leading +
          const phone = rawPhone.replace(/[^\d+]/g, '')
          const name = String(c.name || '').trim().slice(0, 200)
          const email = c.email ? String(c.email).trim().slice(0, 200) : null

          if (!phone && !name) return null

          const normalizedPhone = phone || `NO_NUM_${Math.random().toString(36).substring(7)}`

          return prisma.studentContact.upsert({
            where: {
              studentId_phoneNumber: {
                studentId: session.userId,
                phoneNumber: normalizedPhone,
              },
            },
            create: {
              studentId: session.userId,
              name: name || 'Unnamed Contact',
              phoneNumber: normalizedPhone,
              email,
              source: sanitizedSource,
            },
            update: {
              name: name || undefined,
              email: email || undefined,
              source: sanitizedSource,
              updatedAt: new Date(),
            },
          })
        })
        .filter(Boolean)

      if (operations.length > 0) {
        await prisma.$transaction(operations as any)
        insertedOrUpdated += operations.length
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedOrUpdated,
      message: `Successfully synced ${insertedOrUpdated} contacts`,
    })
  } catch (error) {
    console.error('Error syncing student contacts:', error)
    return NextResponse.json({ error: 'Failed to sync contacts' }, { status: 500 })
  }
}

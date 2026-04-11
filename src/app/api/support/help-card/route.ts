import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await (prisma as any).helpCardConfig.findUnique({
      where: { id: 'singleton' },
    })

    if (!config) {
      // Return defaults if not found
      return NextResponse.json({
        id: 'singleton',
        title: 'Need Help?',
        description: '',
        buttonText: 'Enroll in More',
        redirectUrl: 'mailto:support@example.com',
        isEnabled: true,
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching help card config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, buttonText, redirectUrl, isEnabled } = body

    const config = await (prisma as any).helpCardConfig.upsert({
      where: { id: 'singleton' },
      update: {
        title: title || 'Need Help?',
        buttonText: buttonText || 'Enroll in More',
        redirectUrl: redirectUrl || 'mailto:support@example.com',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
      create: {
        id: 'singleton',
        title: title || 'Need Help?',
        buttonText: buttonText || 'Enroll in More',
        redirectUrl: redirectUrl || 'mailto:support@example.com',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

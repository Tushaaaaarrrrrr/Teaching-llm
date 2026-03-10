import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const messages = await prisma.communityMessage.findMany({
      where: { classId: params.classId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            // Only expose securityNumber to Manager
            securityNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    // Strip securityNumber for non-managers
    const sanitized = messages.map(msg => ({
      ...msg,
      sender: {
        ...msg.sender,
        securityNumber: session.role === 'MANAGER' ? msg.sender.securityNumber : undefined,
      },
    }))

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content } = await request.json()

    const message = await prisma.communityMessage.create({
      data: { classId: params.classId, senderId: session.userId, content },
      include: {
        sender: { select: { id: true, name: true, role: true, securityNumber: true } },
      },
    })

    return NextResponse.json({
      ...message,
      sender: {
        ...message.sender,
        securityNumber: session.role === 'MANAGER' ? message.sender.securityNumber : undefined,
      },
    }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { validateLength, sanitizeInput } from '@/lib/validation'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const messages = await prisma.chatMessage.findMany({
      where: { chatId: params.id },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })

    // Manager oversight: managers see all, students/admins see only non-deleted
    const sanitized = messages.map(msg => {
      const isActuallyDeleted = msg.isDeleted || msg.isSystemDeleted
      return {
        ...msg,
        content: (isActuallyDeleted && session.role !== 'MANAGER') ? '' : msg.content,
      }
    })

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content } = await request.json()
 
    if (!content || !validateLength(content, 2000)) {
      return NextResponse.json({ error: 'Message content must be between 1 and 2,000 characters' }, { status: 400 })
    }

    const sanitizedContent = sanitizeInput(content)

    const message = await prisma.chatMessage.create({
      data: { chatId: params.id, senderId: session.userId, content: sanitizedContent },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    // Bump updatedAt on the session for ordering
    await prisma.chatSession.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = await prisma.userPrompt.findUnique({
      where: { id: params.id },
      include: {
        responses: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, gender: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!prompt) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isActive } = await req.json()

    const updated = await prisma.userPrompt.update({
      where: { id: params.id },
      data: { isActive }
    })

    return NextResponse.json({ prompt: updated })
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.userPrompt.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

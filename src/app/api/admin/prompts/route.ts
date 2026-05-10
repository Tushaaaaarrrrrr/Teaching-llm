import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompts = await prisma.userPrompt.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { responses: true }
        }
      }
    })

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, isActive, questions } = await req.json()

    if (!title || !questions) {
      return NextResponse.json({ error: 'Title and questions are required' }, { status: 400 })
    }

    const newPrompt = await prisma.userPrompt.create({
      data: {
        title,
        description,
        isActive: isActive || false,
        questions: JSON.stringify(questions)
      }
    })

    return NextResponse.json({ prompt: newPrompt })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

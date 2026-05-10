import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the first active prompt that the user HAS NOT answered yet
    const activePrompts = await prisma.userPrompt.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (activePrompts.length === 0) {
      return NextResponse.json({ prompt: null })
    }

    // Check which one the user hasn't answered
    for (const prompt of activePrompts) {
      const response = await prisma.promptResponse.findUnique({
        where: {
          userId_promptId: {
            userId: session.userId,
            promptId: prompt.id
          }
        }
      })

      if (!response) {
        return NextResponse.json({ prompt })
      }
    }

    return NextResponse.json({ prompt: null })
  } catch (error) {
    console.error('Error fetching active prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { promptId, answers } = await req.json()

    if (!promptId || !answers) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Save the response
    await prisma.promptResponse.create({
      data: {
        userId: session.userId,
        promptId: promptId,
        answers: JSON.stringify(answers)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving prompt response:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

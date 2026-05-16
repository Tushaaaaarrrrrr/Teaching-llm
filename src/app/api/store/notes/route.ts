import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { title, description, fileUrl, price } = data

    if (!title || !fileUrl) {
      return NextResponse.json({ error: 'Title and file link are required' }, { status: 400 })
    }

    // In a real app we'd get the manager's ID. Since this is an admin tool for now, we find the first manager.
    // Or we could pass creatorId. But schema says creatorId is required.
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    })

    if (!manager) {
      return NextResponse.json({ error: 'No manager found to assign as creator' }, { status: 500 })
    }

    const note = await prisma.storeNote.create({
      data: {
        title,
        description,
        price,
        createdById: manager.id,
        files: {
          create: {
            title: 'Primary Document',
            fileUrl,
            fileType: 'LINK'
          }
        }
      }
    })

    return NextResponse.json({ note })
  } catch (error: any) {
    console.error('Error creating store note:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const notes = await prisma.storeNote.findMany({
      include: {
        files: true,
        createdBy: { select: { id: true, name: true, email: true } },
        accesses: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ notes })
  } catch (error: any) {
    console.error('Error fetching store notes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

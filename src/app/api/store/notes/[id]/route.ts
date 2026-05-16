import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // Check if manager
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete note files first
    await prisma.storeNoteFile.deleteMany({
      where: { noteId: id }
    })

    await prisma.storeNote.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { title, description, fileUrl, price } = await req.json()

    // Check if manager
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updated = await prisma.storeNote.update({
      where: { id },
      data: {
        title,
        description,
        price: Number(price),
      }
    })

    if (fileUrl) {
      // Check if file exists, if so update it, else create
      const existingFile = await prisma.storeNoteFile.findFirst({ where: { noteId: id } })
      if (existingFile) {
        await prisma.storeNoteFile.update({ where: { id: existingFile.id }, data: { fileUrl } })
      } else {
        await prisma.storeNoteFile.create({ data: { noteId: id, fileUrl } })
      }
    }

    return NextResponse.json({ note: updated })
  } catch (error: any) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

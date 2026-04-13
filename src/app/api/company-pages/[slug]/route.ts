import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    // Find precisely by type + slug
    const page = await prisma.systemUpdate.findFirst({
      where: {
        type: 'CUSTOM_PAGE',
        title: slug,
      }
    })

    if (!page) {
      // Return a blank template if not customized yet
      return NextResponse.json({ id: null, title: slug, content: '' })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('[GET_COMPANY_PAGE]', error)
    return NextResponse.json({ error: 'Failed to fetch page data' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await req.json()
    const { slug } = params

    if (typeof content !== 'string') {
       return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
    }

    const existing = await prisma.systemUpdate.findFirst({
      where: {
        type: 'CUSTOM_PAGE',
        title: slug,
      }
    })

    let page
    if (existing) {
      page = await prisma.systemUpdate.update({
        where: { id: existing.id },
        data: { content },
      })
    } else {
      page = await prisma.systemUpdate.create({
        data: {
          title: slug,
          content,
          type: 'CUSTOM_PAGE',
          createdById: session.userId,
        }
      })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('[POST_COMPANY_PAGE]', error)
    return NextResponse.json({ error: 'Failed to save page data' }, { status: 500 })
  }
}

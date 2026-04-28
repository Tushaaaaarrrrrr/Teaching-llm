import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const offerings = await prisma.courseOffering.findMany({
      include: {
        course: {
          select: {
            id: true,
            name: true,
            subject: true,
            color: true,
            icon: true,
            teacherName: true,
            isDisabled: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Filter out disabled courses for students, managers see all
    const session = await getSession()
    const role = session?.user?.role
    
    let filteredOfferings = offerings
    if (role !== 'MANAGER' && role !== 'SUPER_MANAGER') {
      filteredOfferings = offerings.filter(o => !o.course.isDisabled)
    }

    return NextResponse.json(filteredOfferings)
  } catch (error) {
    console.error('[course-offerings] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch course offerings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'SUPER_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { 
      courseId, name, thumbnail, 
      hasRecorded, recordedOriginalPrice, recordedDiscountPrice,
      hasLive, liveOriginalPrice, liveDiscountPrice 
    } = data

    if (!courseId || !name) {
      return NextResponse.json({ error: 'Course and Name are required' }, { status: 400 })
    }

    const offering = await prisma.courseOffering.create({
      data: {
        courseId,
        name,
        thumbnail,
        hasRecorded: !!hasRecorded,
        recordedOriginalPrice: recordedOriginalPrice ? Number(recordedOriginalPrice) : null,
        recordedDiscountPrice: recordedDiscountPrice ? Number(recordedDiscountPrice) : null,
        hasLive: !!hasLive,
        liveOriginalPrice: liveOriginalPrice ? Number(liveOriginalPrice) : null,
        liveDiscountPrice: liveDiscountPrice ? Number(liveDiscountPrice) : null,
      }
    })

    return NextResponse.json(offering, { status: 201 })
  } catch (error) {
    console.error('[course-offerings] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create course offering' }, { status: 500 })
  }
}

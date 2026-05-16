import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logCourseDataDiagnostics } from '@/lib/course-data-diagnostics'

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
    const role = session?.role
    
    let filteredOfferings = offerings
    if (role !== 'MANAGER' && role !== 'SUPER_ADMIN') {
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
    if (!session || (session.role !== 'MANAGER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { 
      courseId, classId, name, thumbnail, 
      hasRecorded, recordedOriginalPrice, recordedDiscountPrice,
      hasLive, liveOriginalPrice, liveDiscountPrice 
    } = data
    const resolvedCourseId = courseId || classId

    if (!resolvedCourseId) {
      return NextResponse.json({ error: 'Course is required' }, { status: 400 })
    }

    const course = await prisma.course.findUnique({
      where: { id: resolvedCourseId },
      select: { id: true, name: true },
    })

    if (!course) {
      await logCourseDataDiagnostics({
        reason: 'course_offering_selected_course_missing',
        requestedCourseId: resolvedCourseId,
        sessionRole: session.role,
        userId: session.userId,
      })
      return NextResponse.json({ error: 'Selected course was not found' }, { status: 404 })
    }

    // Prevent duplicate offerings for the same course
    const existing = await prisma.courseOffering.findFirst({
      where: { courseId: resolvedCourseId }
    })

    if (existing) {
      return NextResponse.json({ error: 'This course is already in the store.' }, { status: 400 })
    }

    const offering = await prisma.courseOffering.create({
      data: {
        courseId: resolvedCourseId,
        name: name || course.name,
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

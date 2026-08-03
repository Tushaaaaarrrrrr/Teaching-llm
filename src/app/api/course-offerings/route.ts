import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logCourseDataDiagnostics } from '@/lib/course-data-diagnostics'

export async function GET(request: NextRequest) {
  try {
    // Auth FIRST — don't waste a DB query if user is unauthenticated
    const session = await getSession()
    const role = session?.role
    const isManager = role === 'MANAGER'

    // SQL-level filtering: non-managers never see disabled courses
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
            isDemoPaid: true,
            demoPrice: true,
            isDemoEnabled: true,
            demoExpiryDays: true,
            topics: {
              select: {
                content: { select: { isDemo: true } },
                sharedContentLinks: { select: { content: { select: { isDemo: true } } } },
              },
            },
            lectures: { select: { isDemo: true } },
          }
        }
      },
      where: isManager ? {} : { course: { isDisabled: false } },
      orderBy: { createdAt: 'desc' }
    })

    const processedOfferings = offerings.map(off => {
      let hasDemoLectures = false
      const c = off.course as any
      if (c?.topics) {
        c.topics.forEach((t: any) => {
          t.content?.forEach((cnt: any) => { if (cnt.isDemo) hasDemoLectures = true })
          t.sharedContentLinks?.forEach((link: any) => { if (link.content?.isDemo) hasDemoLectures = true })
        })
      }
      if (c?.lectures?.some((l: any) => l.isDemo)) hasDemoLectures = true

      const { topics, lectures, ...cleanCourse } = c
      return {
        ...off,
        course: {
          ...cleanCourse,
          hasDemoLectures,
        },
      }
    })

    return NextResponse.json(processedOfferings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error) {
    console.error('[course-offerings] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch course offerings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { 
      courseId, classId, name, thumbnail,
      hasRecorded, recordedOriginalPrice, recordedDiscountPrice,
      hasLive, liveOriginalPrice, liveDiscountPrice,
      championOriginalPrice, championDiscountPrice, championSubtitle
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
        championOriginalPrice: championOriginalPrice ? Number(championOriginalPrice) : null,
        championDiscountPrice: championDiscountPrice ? Number(championDiscountPrice) : null,
        championSubtitle: championSubtitle || null,
      }
    })

    return NextResponse.json(offering, { status: 201 })
  } catch (error) {
    console.error('[course-offerings] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create course offering' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getAccessibleCourseIds } from '@/lib/auth'

// ─── POST: Toggle mute preference ──────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { courseId } = params
    if (!courseId || courseId.startsWith('dm_')) {
      return NextResponse.json({ error: 'Cannot mute DMs here' }, { status: 400 })
    }

    // Verify user has access to this course
    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { muted } = await request.json()
    if (typeof muted !== 'boolean') {
      return NextResponse.json({ error: 'muted must be a boolean' }, { status: 400 })
    }

    const pref = await prisma.communityMutePreference.upsert({
      where: {
        userId_courseId: { userId: session.userId, courseId },
      },
      create: { userId: session.userId, courseId, isMuted: muted },
      update: { isMuted: muted },
    })

    return NextResponse.json({ muted: pref.isMuted })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET: Get mute status for a course ──────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { courseId } = params
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })

    const pref = await prisma.communityMutePreference.findUnique({
      where: {
        userId_courseId: { userId: session.userId, courseId },
      },
    })

    return NextResponse.json({ muted: pref?.isMuted ?? false })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET all mute preferences for the user (batch) ─────────────────────────
// Usage: GET /api/community/all/mute → returns { prefs: { courseId: boolean } }

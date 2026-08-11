import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, isStudentEnrolledInContent } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/content/[id]/variants
 *
 * Returns the per-quality Drive variants the Flutter player should expose in
 * its quality picker. Access mirrors /api/drive-stream — must be authenticated
 * and enrolled (managers/admins/instructors get a pass).
 *
 * Response shape:
 *   { variants: { "360p": true, "720p": true, "1080p": true } }
 *
 * We deliberately do NOT return the underlying Drive file IDs — the player
 * only needs the list of *labels* it can request via `?quality=` against
 * /api/drive-stream. Keeping file IDs server-side prevents users from
 * exfiltrating the raw Drive URLs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const content = await prisma.content.findUnique({
    where: { id },
    select: {
      videoVariants: true,
      topic: { select: { courseId: true } },
    },
  })
  if (!content) {
    return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
  }

  const privileged =
    isAdminOrManager(session.role) || session.role === 'INSTRUCTOR'
  if (!privileged) {
    const isEnrolled = await isStudentEnrolledInContent(
      session.userId,
      id,
      content.topic?.courseId
    )
    if (!isEnrolled) {
      return NextResponse.json(
        { error: 'You are not enrolled in this course' },
        { status: 403 }
      )
    }
  }

  const variants: Record<string, true> = {}
  const raw = content.videoVariants as Record<string, unknown> | null
  if (raw && typeof raw === 'object') {
    for (const [label, fileId] of Object.entries(raw)) {
      if (typeof fileId === 'string' && fileId.trim().length > 0) {
        variants[label] = true
      }
    }
  }

  return NextResponse.json({ variants })
}

import { notFound, redirect } from 'next/navigation'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ contentId: string }>
}

/**
 * Server component for the lecture-material redirect.
 *
 * Mirrors /free-resources/materials/[id]/view but reads from the Content
 * row's `pptUrl` (lecture handouts/notes) instead of a Material row. We
 * keep the auth + enrollment gate here, then send the user straight to the
 * source URL instead of rendering the in-app PDF viewer in the web shell.
 *
 * The flow is:
 *   - validate the session
 *   - check the content actually has a pptUrl
 *   - redirect to the raw material URL
 */
export default async function MaterialViewPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { contentId } = await params

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      title: true,
      pptUrl: true,
      topic: { select: { courseId: true } },
    },
  })
  if (!content || !content.pptUrl) return notFound()

  // Enrollment gate — managers / admins / instructors bypass.
  const privileged =
    isAdminOrManager(session.role) || session.role === 'INSTRUCTOR'
  if (!privileged) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: content.topic.courseId,
        },
      },
    })
    if (!enrollment) redirect(`/courses/${content.topic.courseId}`)
  }

  redirect(content.pptUrl)
}

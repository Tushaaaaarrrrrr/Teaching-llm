import { notFound, redirect } from 'next/navigation'
import { getSession, isAdminOrManager } from '@/lib/auth'
import { prisma } from '@/lib/db'
import SecureWebPdfViewer from '@/components/pdf/SecureWebPdfViewerLoader'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ contentId: string }>
}

/**
 * Server component for the lecture-material viewer.
 *
 * Mirrors /free-resources/materials/[id]/view but reads from the Content
 * row's `pptUrl` (lecture handouts/notes) instead of a Material row. The
 * existing /api/drive-doc/[contentId] proxy handles auth + enrollment +
 * Drive byte streaming, so this page just needs to:
 *   - validate the session
 *   - check the content actually has a pptUrl
 *   - bounce non-PDFs to the raw URL (the viewer can't render PPTX)
 *   - hand the proxy URL + the student's email to the watermarked client
 *     viewer
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

  // Only PDFs render in PDF.js; bounce PPTX/DOCX/etc. to the raw URL so
  // the student gets the file straight from Drive (a worse experience,
  // but at least functional).
  const looksPdf =
    /\.pdf(\?|$)/i.test(content.pptUrl) ||
    // Drive file URLs don't carry the extension; if the manager didn't
    // explicitly mark it, optimistically try the viewer — PDF.js will
    // throw a parse error in the client viewer which renders cleanly.
    content.pptUrl.includes('drive.google.com')
  if (!looksPdf) {
    redirect(content.pptUrl)
  }

  return (
    <SecureWebPdfViewer
      fileUrl={`/api/drive-doc/${content.id}`}
      watermarkEmail={session.email || session.name || 'GenZ IITian'}
      title={content.title}
    />
  )
}

import { notFound, redirect } from 'next/navigation'
import { getSession, isAdminOrManager, isStudentEnrolledInContent } from '@/lib/auth'
import { prisma } from '@/lib/db'
import MaterialViewerClient from '@/components/pdf/MaterialViewerClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ contentId: string }>
}

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
      topic: {
        select: {
          courseId: true,
          course: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!content || !content.pptUrl) return notFound()

  // Enrollment gate — managers / admins / instructors bypass.
  const privileged =
    isAdminOrManager(session.role) || session.role === 'INSTRUCTOR'
  if (!privileged) {
    const isEnrolled = await isStudentEnrolledInContent(
      session.userId,
      content.id,
      content.topic?.courseId
    )
    if (!isEnrolled) redirect('/dashboard')
  }

  return (
    <MaterialViewerClient
      contentId={content.id}
      contentType="LECTURE_NOTE"
      downloadUrl={`/api/drive-doc/${content.id}`}
      fallbackUrl={content.pptUrl}
      title={content.title}
      courseId={content.topic?.courseId}
      courseName={content.topic?.course?.name || 'Lecture Notes'}
      watermarkEmail={session.email}
      userId={session.userId}
      backHref={content.topic?.courseId ? `/courses/${content.topic.courseId}` : '/courses'}
    />
  )
}

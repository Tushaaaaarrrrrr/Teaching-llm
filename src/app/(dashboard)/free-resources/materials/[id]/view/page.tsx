import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import MaterialViewerClient from '@/components/pdf/MaterialViewerClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function MaterialViewPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login?next=/free-resources/materials')

  const { id } = await params

  const material = await prisma.material.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      fileType: true,
      isFree: true,
      isGlobal: true,
      courseId: true,
      course: { select: { name: true } },
    },
  })
  if (!material) return notFound()

  return (
    <MaterialViewerClient
      contentId={material.id}
      contentType="STUDY_MATERIAL"
      downloadUrl={`/api/drive-material/${material.id}`}
      fallbackUrl={material.fileUrl}
      title={material.title}
      courseId={material.courseId}
      courseName={material.course?.name || 'Free Resources'}
      watermarkEmail={session.email}
      userId={session.userId}
      backHref="/free-resources/materials"
    />
  )
}

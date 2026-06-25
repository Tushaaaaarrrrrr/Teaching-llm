import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Server component: gates access, looks up the material, then redirects the
 * user straight to the source URL. We keep the auth check here but avoid the
 * in-app PDF viewer in the web / Capacitor shell.
 */
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
    },
  })
  if (!material) return notFound()

  redirect(material.fileUrl)
}

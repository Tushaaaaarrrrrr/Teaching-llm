import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractDriveFileId } from '@/lib/drive'
// SecureWebPdfViewerLoader is the Client Component that handles the
// dynamic({ ssr: false }) split — Server Components can't call that
// directly in Next 14.
import SecureWebPdfViewer from '@/components/pdf/SecureWebPdfViewerLoader'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Server component: gates access, looks up the material, decides whether it
 * lives behind the Drive proxy, and renders the client viewer. The page is
 * NOT prerendered (`force-dynamic`) so the session always reflects the
 * current user — we use `session.email` as the watermark text.
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

  // Non-PDF files don't render in PDF.js — bounce to the raw URL.
  const looksPdf =
    (material.fileType || '').toLowerCase().includes('pdf') ||
    /\.pdf(\?|$)/i.test(material.fileUrl)
  if (!looksPdf) {
    redirect(material.fileUrl)
  }

  // Decide what URL the viewer fetches. Drive files go through our auth
  // proxy (/api/drive-doc/<contentId> requires session + enrollment), which
  // forces application/pdf + private cache. Non-Drive URLs (rare for the
  // free-resources catalogue but possible if a manager pasted a direct
  // CDN link) are passed through as-is.
  const fileId = extractDriveFileId(material.fileUrl)
  const isDrive = !!fileId
  const viewerSrc = isDrive
    ? `/api/drive-material/${material.id}`
    : material.fileUrl

  return (
    <SecureWebPdfViewer
      fileUrl={viewerSrc}
      watermarkEmail={session.email || session.name || 'GenZ IITian'}
      title={material.title}
    />
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface ContentItem {
  id: string
  title: string
  description?: string
  videoUrl?: string
  videoSource: string
  pptUrl?: string
}

interface ClassDetail {
  id: string
  name: string
  color: string
}

export default function LecturePage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [contentRes, clsRes] = await Promise.all([
        fetch(`/api/content/${params.lectureId}`),
        fetch(`/api/classes/${params.id}`),
      ])
      
      if (!contentRes.ok || !clsRes.ok) {
        router.push(`/classes/${params.id}`)
        return
      }

      const contentData = await contentRes.json()
      const clsData = await clsRes.json()

      setContent(contentData)
      setCls(clsData.class || clsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id, params.lectureId, router])

  useEffect(() => { fetchData() }, [fetchData])

  const getEmbedUrl = (url: string, source: string) => {
    if (!url) return ''
    if (source === 'YOUTUBE') {
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s]+)/)
      const videoId = ytMatch ? ytMatch[1] : url
      // Minimal UI: rel=0, showinfo=0, modestbranding=1
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`
    }
    if (source === 'DRIVE') {
      // Convert drive share link to preview link
      const driveMatch = url.match(/\/file\/d\/([^/]+)/)
      const fileId = driveMatch ? driveMatch[1] : url
      return `https://drive.google.com/file/d/${fileId}/preview`
    }
    return url
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: '400px', borderRadius: '16px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }} />
      </div>
    )
  }

  if (!content || !cls) return null

  const embedUrl = getEmbedUrl(content.videoUrl || '', content.videoSource)

  return (
    <div className="page-container fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href={`/classes/${params.id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: '#6b6b8a', fontSize: '13px', textDecoration: 'none', fontWeight: '500'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to {cls.name}
        </Link>
      </div>

      <div style={{ 
        background: '#fff', borderRadius: '24px', overflow: 'hidden', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)', marginBottom: '24px' 
      }}>
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              No video available for this lecture.
            </div>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', marginBottom: '4px' }}>{content.title}</h1>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#9999b0', background: '#f0f0f5', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                  LECTURE ID: {content.id}
                </span>
                <span style={{ fontSize: '12px', color: content.videoSource === 'YOUTUBE' ? '#ff0000' : '#10b981', fontWeight: '700' }}>
                  Via {content.videoSource}
                </span>
              </div>
            </div>
            {content.pptUrl && (
              <a href={content.pptUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ borderRadius: '50px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Resources
              </a>
            )}
          </div>

          <div style={{ height: '1px', background: '#f0f1f5', marginBottom: '16px' }} />

          <div>
             <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e1e3a', marginBottom: '8px' }}>Description</h3>
             <p style={{ fontSize: '14px', color: '#6b6b8a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
               {content.description || 'No description provided for this lecture.'}
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}

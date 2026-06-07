'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react'

interface ContentItem {
  id: string
  title: string
  description?: string
  videoUrl?: string
  videoSource: string
  topic: {
    id: string
    title: string
    course: {
      id: string
      name: string
      color: string
    }
  }
}

export default function PlayDriveVideoPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/${params.lectureId}`)
      if (!res.ok) {
        setError('Failed to load video details')
        return
      }
      const data = await res.json()
      setContent(data)
    } catch (e) {
      console.error(e)
      setError('An error occurred while loading video details')
    } finally {
      setLoading(false)
    }
  }, [params.lectureId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getEmbedUrl = (url: string | undefined, source: string) => {
    if (!url) return ''
    const u = url.trim()
    const isDriveUrl = /drive\.google\.com|docs\.google\.com/i.test(u)
    if (source === 'GOOGLE_DRIVE' || isDriveUrl) {
      const fileIdMatch = u.match(/\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/)
      if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
      }
    }
    return u
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#090d16', color: '#fff', gap: '16px'
      }}>
        <Loader2 className="animate-spin" size={36} color="#6366f1" />
        <span style={{ fontSize: '15px', color: '#94a3b8', fontWeight: '500' }}>Loading player...</span>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#090d16', color: '#fff', gap: '16px', padding: '24px', textAlign: 'center'
      }}>
        <AlertCircle size={48} color="#ef4444" />
        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Error Loading Video</h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '300px' }}>
          {error || "We couldn't retrieve the video content."}
        </p>
        <button
          onClick={() => router.back()}
          style={{
            background: '#334155', color: '#fff', border: 'none', borderRadius: '50px',
            padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '12px'
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  const embedUrl = getEmbedUrl(content.videoUrl, content.videoSource)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: '#000', color: '#fff',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      overflow: 'hidden'
    }}>
      {/* Top Header Row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', background: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 10, flexShrink: 0
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#fff', cursor: 'pointer', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {content.topic.course.name}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {content.title}
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div style={{
        flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#000'
      }}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>
            <AlertCircle size={40} style={{ marginBottom: '12px', opacity: 0.6 }} />
            <p>No video URL was provided for this lecture.</p>
          </div>
        )}
      </div>
    </div>
  )
}

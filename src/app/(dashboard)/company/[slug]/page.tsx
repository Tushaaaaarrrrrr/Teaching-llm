'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import RichTextEditor from '@/components/ui/RichTextEditor'

export default function CompanyPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const isAboutUs = slug === 'about-us'
  const titleText = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const { data: userData } = useSWR('/api/auth/me', (url: string) => fetch(url).then(r => r.json()))
  const isManager = userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER'

  const { data: pageData, mutate } = useSWR(`/api/company-pages/${slug}`, (url: string) => fetch(url).then(r => r.json()))

  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (pageData && !isEditing) {
      setContent(pageData.content || '')
    }
  }, [pageData, isEditing])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/company-pages/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        setIsEditing(false)
        mutate()
      } else {
        alert('Failed to save page.')
      }
    } catch {
      alert('Error saving. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '40px',
    minHeight: '500px'
  }
  
  const neuButton: React.CSSProperties = {
    padding: '10px 24px', borderRadius: '50px', border: 'none',
    background: '#3636e8', color: '#fff', fontSize: '14px', fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)',
    transition: 'all 0.2s ease',
  }

  const neuButtonSecondary: React.CSSProperties = {
    padding: '10px 24px', borderRadius: '50px', border: 'none',
    background: '#e8eaf0', color: '#6b6b8a', fontSize: '14px', fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
    transition: 'all 0.2s ease',
  }

  if (!pageData) {
     return <div style={{ padding: '32px', textAlign: 'center', color: '#9999b0', fontWeight: 600 }}>Loading {titleText}...</div>
  }

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => router.back()}
            style={{ 
              ...neuButtonSecondary, 
              padding: '10px', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: '50%' 
            }}
            title="Go Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1e1e3a', margin: 0, letterSpacing: '-0.5px' }}>
            {titleText}
          </h1>
        </div>

        {isManager && !isEditing && (
          <button 
            onClick={() => { setContent(pageData.content || ''); setIsEditing(true); }} 
            style={{ ...neuButton, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Page
          </button>
        )}
        
        {isManager && isEditing && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setIsEditing(false)} style={neuButtonSecondary}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ ...neuButton, opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        )}
      </div>

      <div style={neuCard}>
        {isEditing ? (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#6b6b8a', fontWeight: 600 }}>
              Use the toolbar below to format your content. Feel free to use bold, italics, or lists.
            </div>
            <RichTextEditor 
              value={content} 
              onChange={setContent} 
              placeholder={`Write your ${titleText} here...`} 
              minHeight="400px" 
            />
          </div>
        ) : (
          <div 
            className="custom-page-content"
            style={{ color: '#4a4a68', lineHeight: '1.8', fontSize: '16px' }}
            dangerouslySetInnerHTML={{ __html: content || `<p style="color: #9999b0; font-style: italic; text-align: center; padding: 40px;">No content available for ${titleText}. ${isManager ? 'Click Edit to add something.' : ''}</p>` }}
          />
        )}
      </div>

      {!isEditing && isAboutUs && (
        <div style={{ 
          marginTop: '40px', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '16px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '8px' }}>Manage Policies</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { href: '/company/privacy-policy', label: 'Privacy Policy' },
              { href: '/company/return-policy', label: 'Return / Refund Policy' },
              { href: '/company/copyright-policy', label: 'Copyright Policy' },
            ].map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                style={{ 
                  padding: '16px 24px', 
                  background: '#e8eaf0', 
                  borderRadius: '16px',
                  color: '#3636e8',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Global styles for the rich text editor viewing mode */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-page-content h1 { font-size: 2em; margin-bottom: 0.5em; font-weight: 800; color: #1e1e3a; }
        .custom-page-content h2 { font-size: 1.5em; margin-bottom: 0.5em; font-weight: 700; color: #2e2e4a; margin-top: 1.5em; }
        .custom-page-content p { margin-bottom: 1em; }
        .custom-page-content ul, .custom-page-content ol { padding-left: 2em; margin-bottom: 1em; }
        .custom-page-content li { margin-bottom: 0.5em; }
        .custom-page-content a { color: #3636e8; text-decoration: underline; font-weight: 600; }
        .custom-page-content strong, .custom-page-content b { font-weight: 700; color: #1e1e3a; }
      `}} />
    </div>
  )
}

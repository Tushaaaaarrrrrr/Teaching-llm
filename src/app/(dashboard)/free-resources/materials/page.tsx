'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function FreeMaterialsPage() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const { data: authData } = useSWR('/api/auth/me', fetcher)
  const { data: materials, isLoading } = useSWR<any[]>('/api/free-resources/materials', fetcher)

  const userRole = authData?.user?.role || ''
  const canManage = userRole === 'MANAGER'

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [sourceType, setSourceType] = useState<'FILE' | 'LINK'>('FILE')
  const [saving, setSaving] = useState(false)

  const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }))

  async function handleSave() {
    if (!formData.title) {
      alert('Title is required')
      return
    }

    // Validate source
    if (sourceType === 'FILE' && !formData.fileUrl) {
      alert('Please provide a file URL')
      return
    }
    if (sourceType === 'LINK' && !formData.fileUrl) {
      alert('Please provide a link URL')
      return
    }

    // Validate URL format
    if (!formData.fileUrl.startsWith('http://') && !formData.fileUrl.startsWith('https://')) {
      alert('Please enter a valid URL starting with http:// or https://')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/free-resources/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sourceType,
        }),
      })
      if (res.ok) {
        setShowModal(false)
        setFormData({})
        setSourceType('FILE')
        mutate('/api/free-resources/materials')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create material')
      }
    } catch (e) {
      console.error(e)
      alert('Error creating material')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const allowed = await confirm({
      title: 'Delete Material?',
      message: 'This free material will be permanently removed.',
      confirmLabel: 'Delete Material',
      tone: 'danger',
    })
    if (!allowed) return
    await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    mutate('/api/free-resources/materials')
  }

  function getFileIcon(fileType: string) {
    const type = (fileType || '').toLowerCase()
    if (type === 'link') return '🔗'
    if (type.includes('pdf')) return '📄'
    if (type.includes('doc') || type.includes('word')) return '📝'
    if (type.includes('ppt') || type.includes('presentation')) return '📊'
    if (type.includes('xls') || type.includes('sheet')) return '📈'
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return '🖼️'
    if (type.includes('video') || type.includes('mp4')) return '🎬'
    return '📎'
  }

  if (isLoading) {
    return <div className="page-container fade-in"><div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Free Materials...</div></div>
  }

  return (
    <div className="page-container fade-in">
      {confirmDialog}
      <div className="page-header">
        <div />
        {canManage && (
          <button onClick={() => { setFormData({}); setSourceType('FILE'); setShowModal(true) }} className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Free Material
          </button>
        )}
      </div>

      {!materials || materials.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No free materials available yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {materials.map(mat => (
            <div key={mat.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{getFileIcon(mat.fileType)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mat.title}
                  </div>
                  {mat.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {mat.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: mat.sourceType === 'LINK' ? 'var(--info-light)' : 'var(--success-light)', color: mat.sourceType === 'LINK' ? 'var(--info)' : 'var(--success)', fontWeight: '600' }}>
                  {mat.sourceType === 'LINK' ? 'LINK' : (mat.fileType || 'File').toUpperCase()}
                </span>
                {mat.fileSize && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mat.fileSize}</span>
                )}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {new Date(mat.uploadedAt).toLocaleDateString('en-GB')}
                </span>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                <a
                  href={mat.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '13px' }}
                >
                  {mat.sourceType === 'LINK' ? 'Open Link' : 'Download / View'}
                </a>
                {canManage && (
                  <button onClick={() => handleDelete(mat.id)} className="btn btn-ghost" style={{ padding: '0 12px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowModal(false)}
        >
          <div className="modal" style={{ width: '500px', maxWidth: '95vw', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>Add Free Material</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={formData.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Physics Formula Sheet" />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" value={formData.description || ''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} placeholder="Optional description" />
              </div>

              {/* Source Type Toggle */}
              <div className="form-group">
                <label className="form-label">Source Type *</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, padding: '12px', borderRadius: '8px', border: `2px solid ${sourceType === 'FILE' ? 'var(--accent)' : 'var(--surface-2)'}`, background: sourceType === 'FILE' ? 'var(--primary-light)' : 'transparent' }}>
                    <input
                      type="radio"
                      name="sourceType"
                      value="FILE"
                      checked={sourceType === 'FILE'}
                      onChange={() => setSourceType('FILE')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: sourceType === 'FILE' ? '600' : '500', color: 'var(--text-primary)' }}>📄 Upload File</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, padding: '12px', borderRadius: '8px', border: `2px solid ${sourceType === 'LINK' ? 'var(--accent)' : 'var(--surface-2)'}`, background: sourceType === 'LINK' ? 'var(--primary-light)' : 'transparent' }}>
                    <input
                      type="radio"
                      name="sourceType"
                      value="LINK"
                      checked={sourceType === 'LINK'}
                      onChange={() => setSourceType('LINK')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: sourceType === 'LINK' ? '600' : '500', color: 'var(--text-primary)' }}>🔗 External Link</span>
                  </label>
                </div>
              </div>

              {/* Show File Upload or Link Input */}
              {sourceType === 'FILE' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">File URL *</label>
                    <input className="form-input" value={formData.fileUrl || ''} onChange={e => set('fileUrl', e.target.value)} placeholder="https://… (PDF, PPT, DOCX, etc.)" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">File Type</label>
                    <input className="form-input" value={formData.fileType || ''} onChange={e => set('fileType', e.target.value)} placeholder="e.g. pdf, pptx, docx" />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">External Link URL *</label>
                  <input className="form-input" value={formData.fileUrl || ''} onChange={e => set('fileUrl', e.target.value)} placeholder="https://example.com/resource" />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Create Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import {
  DownloadCloud,
  FileText,
  Trash2,
  BookOpen,
  Search,
  HardDrive,
  ArrowLeft,
  AlertTriangle,
  Folder,
} from 'lucide-react'
import {
  getDownloadedNotes,
  deleteDownloadedNote,
  deleteAllDownloadedNotes,
  getTotalDownloadSize,
  OfflineNoteRecord,
} from '@/lib/offline-db'
import SecureWebPdfViewerLoader from '@/components/pdf/SecureWebPdfViewerLoader'
import OfflineBanner from '@/components/ui/OfflineBanner'

const fetcher = (url: string) => fetch(url).then(res => res.json())

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function DownloadsPage() {
  const { data: userData } = useSWR('/api/auth/me', fetcher, { revalidateOnFocus: false })
  const user = userData?.user

  // Effective user ID: from live SWR session or stored localStorage snapshot if offline
  const [effectiveUserId, setEffectiveUserId] = useState<string>('')
  const [effectiveUserEmail, setEffectiveUserEmail] = useState<string>('')
  const [notes, setNotes] = useState<OfflineNoteRecord[]>([])
  const [totalSize, setTotalSize] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeNote, setActiveNote] = useState<OfflineNoteRecord | null>(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Resolve user identity (online or cached)
  useEffect(() => {
    if (user?.id) {
      setEffectiveUserId(user.id)
      setEffectiveUserEmail(user.email || '')
      try {
        localStorage.setItem('cached_student_id', user.id)
        localStorage.setItem('cached_student_email', user.email || '')
      } catch {}
    } else if (typeof window !== 'undefined') {
      const cachedId = localStorage.getItem('cached_student_id') || ''
      const cachedEmail = localStorage.getItem('cached_student_email') || ''
      if (cachedId) {
        setEffectiveUserId(cachedId)
        setEffectiveUserEmail(cachedEmail)
      }
    }
  }, [user])

  // Load notes from IndexedDB for the effective user
  const loadDownloads = useCallback(async () => {
    if (!effectiveUserId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [downloadedList, totalBytes] = await Promise.all([
        getDownloadedNotes(effectiveUserId),
        getTotalDownloadSize(effectiveUserId),
      ])
      setNotes(downloadedList)
      setTotalSize(totalBytes)
    } catch (err) {
      console.error('Failed to load offline downloads:', err)
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId])

  useEffect(() => {
    loadDownloads()
  }, [loadDownloads])

  const handleDeleteSingle = async (note: OfflineNoteRecord) => {
    try {
      setDeletingId(note.id)
      await deleteDownloadedNote(note.userId, note.contentId)
      if (activeNote?.id === note.id) {
        setActiveNote(null)
      }
      await loadDownloads()
    } catch (err) {
      console.error('Failed to delete note:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!effectiveUserId) return
    try {
      await deleteAllDownloadedNotes(effectiveUserId)
      setActiveNote(null)
      setShowDeleteAllModal(false)
      await loadDownloads()
    } catch (err) {
      console.error('Failed to delete all notes:', err)
    }
  }

  // Filter notes by search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        (n.courseName && n.courseName.toLowerCase().includes(q))
    )
  }, [notes, searchQuery])

  // Group notes by course
  const groupedByCourse = useMemo(() => {
    const map = new Map<string, OfflineNoteRecord[]>()
    for (const note of filteredNotes) {
      const courseKey = note.courseName || 'General Study Materials'
      if (!map.has(courseKey)) {
        map.set(courseKey, [])
      }
      map.get(courseKey)!.push(note)
    }
    return Array.from(map.entries())
  }, [filteredNotes])

  // If a note is currently open in full reading mode
  if (activeNote) {
    return (
      <div className="page-container" style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setActiveNote(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} />
            Back to Downloads
          </button>
        </div>

        <SecureWebPdfViewerLoader
          fileBlob={activeNote.fileBlob}
          title={activeNote.title}
          watermarkEmail={effectiveUserEmail}
          onBack={() => setActiveNote(null)}
        />
      </div>
    )
  }

  return (
    <div className="page-container fade-in" style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto' }}>
      <OfflineBanner showDownloadsLink={false} />

      {/* Top Header Card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '28px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
              flexShrink: 0,
            }}
          >
            <DownloadCloud size={28} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '4px',
              }}
            >
              Offline Downloads
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Saved notes and PDFs stored locally inside your browser for 100% offline access.
            </p>
          </div>
        </div>

        {/* Stats Pill & Clear Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '12px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            <HardDrive size={15} style={{ color: 'var(--primary)' }} />
            <span>
              {formatBytes(totalSize)} · {notes.length} {notes.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {notes.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Trash2 size={14} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search Filter if notes exist */}
      {notes.length > 0 && (
        <div
          style={{
            position: 'relative',
            marginBottom: '24px',
            width: '100%',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search downloaded notes by title or course name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 44px',
              borderRadius: '16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && notes.length === 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              marginBottom: '8px',
            }}
          >
            <DownloadCloud size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            No Offline Notes Downloaded
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.6 }}>
            When viewing lectures or study materials online, click the <strong>&quot;Download for Offline&quot;</strong> button to store notes here for internet-free studying.
          </p>
        </div>
      )}

      {/* Grouped Courses List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {groupedByCourse.map(([courseName, courseNotes]) => (
          <div
            key={courseName}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              overflow: 'hidden',
            }}
          >
            {/* Course Title Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 20px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <Folder size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {courseName}
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--surface)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  marginLeft: 'auto',
                }}
              >
                {courseNotes.length} {courseNotes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>

            {/* Notes List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {courseNotes.map((note, idx) => (
                <div
                  key={note.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: idx < courseNotes.length - 1 ? '1px solid var(--border)' : 'none',
                    gap: '14px',
                    flexWrap: 'wrap',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {note.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {formatBytes(note.fileSize)} · Saved on {new Date(note.downloadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setActiveNote(note)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <BookOpen size={14} />
                      Read
                    </button>

                    <button
                      onClick={() => handleDeleteSingle(note)}
                      disabled={deletingId === note.id}
                      title="Delete offline file"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        cursor: deletingId === note.id ? 'wait' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 5, 15, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Delete All Offline Downloads?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
              This will remove all {notes.length} downloaded notes ({formatBytes(totalSize)}) from this browser. You can re-download them anytime while online.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

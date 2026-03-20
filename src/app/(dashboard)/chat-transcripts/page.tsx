'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ClassInfo {
  id: string
  name: string
  subject: string | null
  color: string
  totalMessages: number
  deletedMessages: number
}

interface TranscriptMsg {
  id: string
  content: string
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  sender: {
    id: string
    name: string
    role: string
    securityNumber: string | null
  }
  class: {
    name: string
    subject: string | null
  }
}

export default function ChatTranscriptsPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [messages, setMessages] = useState<TranscriptMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState<'all' | 'deleted'>('all')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [])

  async function loadClasses() {
    setLoading(true)
    try {
      const data = await fetch('/api/community/transcripts').then(r => r.json())
      setClasses(data.classes || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function selectClass(cls: ClassInfo) {
    setSelectedClass(cls)
    setLoadingMessages(true)
    setMessages([])
    try {
      const data = await fetch(`/api/community/transcripts?classId=${cls.id}`).then(r => r.json())
      setMessages(data.messages || [])
    } catch (e) {
      console.error(e)
    }
    setLoadingMessages(false)
  }

  async function exportTranscript(format: 'csv' | 'json' | 'pdf') {
    if (!selectedClass) return
    setExporting(true)
    try {
      const res = await fetch(`/api/community/transcripts/export?classId=${selectedClass.id}&format=${format}`)
      const blob = await res.blob()
      const ext = format === 'pdf' ? 'html' : format
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcript-${selectedClass.name.replace(/\s+/g, '_')}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
    setExporting(false)
  }

  const filteredMessages = messages.filter(msg => {
    if (filter === 'deleted' && !msg.isDeleted) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        msg.content.toLowerCase().includes(q) ||
        msg.sender.name.toLowerCase().includes(q) ||
        (msg.sender.securityNumber || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }
  const neuSmall = { background: '#e8eaf0', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff' }

  return (
    <div className="page-container fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

      {/* Left: Class list */}
      <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '12px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', padding: '0 4px' }}>
          Community Transcripts
        </div>

        {loading && (
          <div style={{ color: '#9999b0', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading...</div>
        )}

        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => selectClass(cls)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '18px', border: 'none',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition: 'all 0.2s',
              background: selectedClass?.id === cls.id ? cls.color : '#e8eaf0',
              color: selectedClass?.id === cls.id ? '#fff' : '#1e1e3a',
              boxShadow: selectedClass?.id === cls.id
                ? `5px 5px 12px ${cls.color}55, -3px -3px 8px rgba(255,255,255,0.6)`
                : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: selectedClass?.id === cls.id ? 'rgba(255,255,255,0.25)' : cls.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '800',
              color: selectedClass?.id === cls.id ? '#fff' : cls.color,
            }}>
              {cls.name.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cls.name}
              </div>
              <div style={{ fontSize: '11px', opacity: selectedClass?.id === cls.id ? 0.8 : 0.6, display: 'flex', gap: '8px' }}>
                <span>{cls.totalMessages} msg{cls.totalMessages !== 1 ? 's' : ''}</span>
                {cls.deletedMessages > 0 && (
                  <span style={{ color: selectedClass?.id === cls.id ? 'rgba(255,255,255,0.9)' : '#ef4444' }}>
                    {cls.deletedMessages} deleted
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}

        {!loading && classes.length === 0 && (
          <div style={{ color: '#9999b0', fontSize: '13px', textAlign: 'center', padding: '20px 10px' }}>
            No communities found
          </div>
        )}
      </div>

      {/* Right: Transcript viewer */}
      <div style={{ flex: 1, borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!selectedClass ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#9999b0' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p style={{ fontWeight: '700' }}>Select a community to view transcript</p>
            <p style={{ fontSize: '13px' }}>Full chat history including deleted messages</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: selectedClass.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: '800', color: selectedClass.color,
                boxShadow: `0 4px 10px ${selectedClass.color}22`
              }}>
                {selectedClass.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '18px', color: '#1e1e3a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedClass.name}
                </div>
                <div style={{ fontSize: '13px', color: '#9999b0', fontWeight: '500' }}>
                  {selectedClass.subject ? `${selectedClass.subject} · ` : ''}Community Chat
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => router.push(`/community?id=${selectedClass.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '50px', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700',
                    background: '#3636e8', color: '#fff',
                    boxShadow: '0 4px 12px rgba(54,54,232,0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Back to Chat
                </button>

                <div style={{
                  padding: '8px 16px', borderRadius: '50px',
                  background: '#FEE2E2', color: '#EF4444',
                  fontSize: '12px', fontWeight: '700',
                  boxShadow: 'inset 0 2px 4px rgba(239, 68, 68, 0.1)'
                }}>
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ padding: '12px 24px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search transcript..."
                  style={{
                    width: '100%', padding: '11px 44px 11px 20px', borderRadius: '50px',
                    border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '14px',
                    ...neuInset, color: '#1e1e3a',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {(['all', 'deleted'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '8px 18px', borderRadius: '50px', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700',
                      background: filter === f ? '#3636e8' : '#e8eaf0',
                      color: filter === f ? '#fff' : '#6b6b8a',
                      boxShadow: filter === f ? '0 4px 10px rgba(54,54,232,0.25)' : '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                      transition: 'all 0.2s',
                    }}
                  >
                    {f === 'all' ? 'All' : 'Deleted Only'}
                  </button>
                ))}
              </div>

              <div style={{ width: '1.5px', height: '24px', background: 'rgba(0,0,0,0.08)', margin: '0 4px' }} />

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['csv', 'json', 'pdf'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => exportTranscript(fmt)}
                    disabled={exporting || messages.length === 0}
                    style={{
                      padding: '8px 16px', borderRadius: '12px', border: 'none',
                      cursor: exporting ? 'default' : 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: '700',
                      ...neuSmall,
                      color: exporting ? '#9999b0' : '#4b4b4b',
                      transition: 'all 0.2s',
                    }}
                  >
                    {fmt === 'pdf' ? 'PDF' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9999b0', fontWeight: '600' }}>Loading transcript...</div>
              ) : filteredMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9999b0' }}>
                  <p style={{ fontWeight: '700' }}>No messages found</p>
                  <p style={{ fontSize: '13px', marginTop: '4px' }}>
                    {filter === 'deleted' ? 'No deleted messages in this community' : search ? 'Try a different search term' : 'This community has no messages yet'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#e8eaf0', zIndex: 1 }}>
                      <th style={{ textAlign: 'left', padding: '14px', fontWeight: '700', color: '#6b6b8a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid rgba(0,0,0,0.08)' }}>User</th>
                      <th style={{ textAlign: 'left', padding: '14px', fontWeight: '700', color: '#6b6b8a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid rgba(0,0,0,0.08)' }}>Time</th>
                      <th style={{ textAlign: 'left', padding: '14px', fontWeight: '700', color: '#6b6b8a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid rgba(0,0,0,0.08)' }}>Message</th>
                      <th style={{ textAlign: 'center', padding: '14px', fontWeight: '700', color: '#6b6b8a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid rgba(0,0,0,0.08)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMessages.map(msg => (
                      <tr
                        key={msg.id}
                        style={{
                          background: msg.isDeleted ? '#fff5f5' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!msg.isDeleted) e.currentTarget.style.background = '#f0f0f8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = msg.isDeleted ? '#fff5f5' : 'transparent' }}
                      >
                        <td style={{ padding: '14px', borderBottom: '1px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                              background: msg.sender.role !== 'STUDENT' ? '#3636e8' : '#e8eaf0',
                              boxShadow: msg.sender.role !== 'STUDENT' ? '0 4px 8px rgba(54,54,232,0.2)' : '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: '800',
                              color: msg.sender.role !== 'STUDENT' ? '#fff' : '#6b6b8a',
                            }}>
                              {msg.sender.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e1e3a' }}>{msg.sender.name}</div>
                              <div style={{ fontSize: '11px', color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{msg.sender.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px', borderBottom: '1px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap', color: '#6b6b8a', fontSize: '13px' }}>
                          {new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '14px', borderBottom: '1px solid rgba(0,0,0,0.05)', maxWidth: '500px', wordBreak: 'break-word', color: msg.isDeleted ? '#ef4444' : '#1e1e3a', fontSize: '14px' }}>
                          {msg.content}
                          {msg.isDeleted && (
                            <span style={{
                              marginLeft: '8px', fontSize: '10px', fontWeight: '800',
                              background: '#fef2f2', color: '#ef4444',
                              padding: '2px 8px', borderRadius: '50px',
                            }}>
                              DELETED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px', borderBottom: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 14px', borderRadius: '50px', fontSize: '11px', fontWeight: '800',
                            background: msg.isDeleted ? '#fff5f5' : '#f0fdf4',
                            color: msg.isDeleted ? '#ef4444' : '#22c55e',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}>
                            {msg.isDeleted ? 'Deleted' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

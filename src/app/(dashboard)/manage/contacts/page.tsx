'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'

export default function ManageContactsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const apiUrl = `/api/admin/contacts?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`
  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher)

  const contacts = data?.contacts || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const stats = data?.stats || { totalContacts: 0, totalStudentsWithContacts: 0, uniquePhoneNumbers: 0 }

  const handleExport = () => {
    const exportUrl = `/api/admin/contacts?search=${encodeURIComponent(search)}&export=csv`
    window.open(exportUrl, '_blank')
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '—'
    if (phone.startsWith('NO_NUM_')) return 'No Number Provided'
    return phone
  }

  const getWhatsAppLink = (phone?: string) => {
    if (!phone || phone.startsWith('NO_NUM_')) return null
    const cleanDigits = phone.replace(/[^\d]/g, '')
    if (!cleanDigits) return null
    return `https://wa.me/${cleanDigits}`
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/manage"
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--primary)',
                textDecoration: 'none',
              }}
            >
              ← Back to Management
            </Link>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginTop: '6px',
            marginBottom: '4px',
            letterSpacing: '-0.02em',
          }}>
            👥 Student Synced Contacts
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>
            Contacts synced from students&apos; mobile devices via Flutter and Capacitor apps.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => mutate()}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '13.5px',
            }}
          >
            🔄 Refresh
          </button>

          <button
            onClick={handleExport}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '13.5px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            📥 Export to CSV / Excel
          </button>
        </div>
      </div>

      {/* ── Metric Stat Cards ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Contacts Synced
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {stats.totalContacts.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Students Who Synced
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10B981', marginTop: '4px' }}>
            {stats.totalStudentsWithContacts.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Unique Phone Numbers
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#8B5CF6', marginTop: '4px' }}>
            {stats.uniquePhoneNumbers.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────── */}
      <div className="card" style={{ padding: '14px 18px', borderRadius: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by Contact Name, Phone Number, or Student Name / Email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14.5px',
              color: 'var(--text-primary)',
            }}
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                setPage(1)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontWeight: '700',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Contacts Table ────────────────────────────────────── */}
      <div className="card" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Contact Name
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Phone Number
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Synced By Student
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Source
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Sync Date
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading synced contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      No Synced Contacts Found
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {search ? 'Try adjusting your search filters.' : 'Contacts synced from students’ mobile devices will automatically show up here.'}
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((c: any) => {
                  const waLink = getWhatsAppLink(c.phoneNumber)
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {c.name || 'Unnamed'}
                        </div>
                        {c.email && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {c.email}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 18px', fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {formatPhoneNumber(c.phoneNumber)}
                      </td>

                      {/* Synced by Student */}
                      <td style={{ padding: '14px 18px' }}>
                        {c.student ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <UserAvatar
                              user={c.student}
                              size={32}
                            />
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {c.student.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {c.student.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Unknown</span>
                        )}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          background: c.source === 'FLUTTER_APP' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: c.source === 'FLUTTER_APP' ? 'var(--primary)' : '#10B981',
                        }}>
                          {c.source === 'FLUTTER_APP' ? 'Flutter App' : 'Capacitor App'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700',
                              background: '#25D366',
                              color: '#ffffff',
                              textDecoration: 'none',
                              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                            }}
                          >
                            💬 WhatsApp
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ─────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--border-color)',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {((pagination.page - 1) * limit) + 1} to {Math.min(pagination.page * limit, pagination.total)} of {pagination.total} contacts
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12.5px', borderRadius: '8px' }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '13px', fontWeight: '700' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12.5px', borderRadius: '8px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

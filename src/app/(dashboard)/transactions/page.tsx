'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string | null
  amount: number
  status: string
  createdAt: string
  user: { id: string; name: string; email: string; mobileNumber: string | null }
  course: { id: string; name: string; subject: string | null }
}

interface TransactionData {
  transactions: Transaction[]
  summary: { totalRevenue: number; totalSuccessful: number; totalRecords: number }
}

const FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'last30days', label: 'Last 30 Days' },
  { key: 'last3months', label: 'Last 3 Months' },
]

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/transactions?filter=${filter}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  const filteredTransactions = data?.transactions.filter(tx => {
    const s = searchTerm.toLowerCase()
    return (
      tx.orderId.toLowerCase().includes(s) ||
      tx.user.name.toLowerCase().includes(s) ||
      tx.user.email.toLowerCase().includes(s)
    )
  }) || []

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      SUCCESS: { bg: '#dcfce7', text: '#16a34a' },
      PENDING: { bg: '#fef9c3', text: '#ca8a04' },
      FAILED: { bg: '#fee2e2', text: '#dc2626' },
    }
    const c = colors[status] || { bg: '#f1f5f9', text: '#64748b' }
    return (
      <span style={{
        background: c.bg, color: c.text, padding: '4px 12px',
        borderRadius: '20px', fontSize: '11px', fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: '0.05em'
      }}>
        {status}
      </span>
    )
  }

  return (
    <div className="page-container fade-in">
      {/* Summary Cards */}
      {data?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Total Revenue</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>₹{data.summary.totalRevenue.toLocaleString('en-IN')}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Successful</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#6366f1' }}>{data.summary.totalSuccessful}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Total Records</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{data.summary.totalRecords}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                border: filter === f.key ? '2px solid #6366f1' : '2px solid #e2e8f0',
                background: filter === f.key ? '#eef2ff' : 'white',
                color: filter === f.key ? '#6366f1' : '#64748b',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: filter === f.key ? '0 4px 12px rgba(99,102,241,0.2)' : 'none'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search Order ID, Name or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 20px 12px 48px',
              borderRadius: '50px',
              border: '2px solid #e2e8f0',
              background: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1e293b',
              outline: 'none',
              boxShadow: 'inset 2px 2px 5px #f1f5f9',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
        </div>
      ) : !filteredTransactions.length ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ color: '#64748b', fontWeight: '600' }}>No matching transactions</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Try a different search term or filter.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, i) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '700', color: '#6366f1', fontFamily: 'monospace' }}>{tx.orderId}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{tx.user.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tx.user.email}</div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#334155', fontWeight: '600' }}>{tx.course.name}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>₹{tx.amount}</td>
                    <td style={{ padding: '14px 20px' }}>{statusBadge(tx.status)}</td>
                    <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b' }}>
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <br />
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  orderId: string
  amount: number
  status: string
  createdAt: string
  course: { id: string; name: string; subject: string | null }
}

export default function MyTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my-transactions')
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
      <div style={{ marginBottom: '24px' }}>

        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>All your PRO batch upgrade transactions</p>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
        </div>
      ) : !transactions.length ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ color: '#64748b', fontWeight: '600' }}>No upgrade history yet</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>When you upgrade a course to PRO, your transaction will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {transactions.map(tx => (
            <div key={tx.id} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{tx.course.name}</div>
                <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '700', fontFamily: 'monospace' }}>{tx.orderId}</div>
              </div>
              <div style={{ textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>₹{tx.amount}</div>
              </div>
              <div style={{ textAlign: 'center', minWidth: '100px' }}>
                {statusBadge(tx.status)}
              </div>
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                  {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

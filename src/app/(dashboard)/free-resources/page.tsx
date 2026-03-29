'use client'

import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function FreeResourcesPage() {
  const { data: courses } = useSWR<any[]>('/api/free-resources/courses', fetcher)
  const { data: materials } = useSWR<any[]>('/api/free-resources/materials', fetcher)

  const freeCoursesCount = courses?.length ?? 0
  const freeMaterialsCount = materials?.length ?? 0

  const cards = [
    {
      href: '/free-resources/courses',
      title: 'Free Courses',
      description: 'Browse and self-enroll in free courses with full content access.',
      count: freeCoursesCount,
      countLabel: 'courses available',
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
    },
    {
      href: '/free-resources/materials',
      title: 'Free Materials',
      description: 'Download study materials available for free — no enrollment needed.',
      count: freeMaterialsCount,
      countLabel: 'materials available',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1e1e3a', margin: 0 }}>Free Resources</h1>
        <p style={{ margin: '8px 0 0', color: '#6b6b8a', fontSize: '14px', maxWidth: '600px' }}>
          Access free courses and study materials. Enroll in courses to track your progress or download materials directly.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {cards.map(card => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              minHeight: '180px',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: card.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', flexShrink: 0,
                  boxShadow: `0 8px 20px ${card.color}30`,
                }}>
                  {card.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e1e3a', margin: 0 }}>{card.title}</h2>
                  <div style={{ fontSize: '13px', color: '#6b6b8a', marginTop: '4px' }}>{card.description}</div>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '6px 14px', borderRadius: '20px',
                  background: `${card.color}15`,
                  color: card.color,
                  fontSize: '13px', fontWeight: '700',
                }}>
                  {card.count} {card.countLabel}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

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
    {
      href: '/free-resources/purchased',
      title: 'Purchased Materials',
      description: 'Access your securely purchased study notes. Available for 30 days.',
      count: '30-day',
      countLabel: 'access expiry',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="page-container fade-in">
      <style>{`
        @media (max-width: 768px) {
          .free-resources-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .free-resources-grid .free-res-card {
            padding: 18px 12px !important;
            min-height: 180px !important;
            border-radius: 20px !important;
            gap: 12px !important;
          }
          .free-resources-grid .free-res-icon {
            width: 52px !important;
            height: 52px !important;
            border-radius: 16px !important;
            margin-bottom: 0 !important;
          }
          .free-resources-grid .free-res-icon svg {
            width: 22px !important;
            height: 22px !important;
          }
          .free-resources-grid .free-res-title {
            font-size: 15px !important;
          }
          .free-resources-grid .free-res-desc {
            font-size: 11.5px !important;
            max-width: 100% !important;
          }
          .free-resources-grid .free-res-badge {
            padding: 5px 10px !important;
            font-size: 10px !important;
          }
          .free-resources-grid .free-res-explore {
            font-size: 11px !important;
          }
        }
      `}</style>
      <div className="free-resources-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', width: '100%' }}>
        {cards.map(card => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div className="card free-res-card" style={{
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '20px',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              minHeight: '280px',
              borderRadius: '32px',
              position: 'relative',
              overflow: 'hidden'
            }}
              onMouseEnter={e => { 
                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)' 
                e.currentTarget.style.boxShadow = '20px 20px 40px #c5c7cf, -20px -20px 40px #ffffff'
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.transform = 'translateY(0) scale(1)' 
                e.currentTarget.style.boxShadow = '10px 10px 20px #c5c7cf, -10px -10px 20px #ffffff'
              }}
            >
              {/* Icon Section */}
              <div className="free-res-icon" style={{
                width: '80px', height: '80px', borderRadius: '24px',
                background: card.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0,
                boxShadow: `0 10px 25px ${card.color}40`,
                marginBottom: '4px'
              }}>
                {card.icon}
              </div>

              {/* Text Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 className="free-res-title" style={{ fontSize: '22px', fontWeight: '900', color: '#1e1e3a', margin: 0, letterSpacing: '-0.5px' }}>
                  {card.title}
                </h2>
                <p className="free-res-desc" style={{ 
                  fontSize: '14.5px', 
                  color: '#6b6b8a', 
                  margin: 0, 
                  lineHeight: '1.5',
                  maxWidth: '240px' 
                }}>
                  {card.description}
                </p>
              </div>

              {/* Status Badge */}
              <div style={{ 
                marginTop: 'auto', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div className="free-res-badge" style={{
                  padding: '8px 20px', borderRadius: '50px',
                  background: `${card.color}12`,
                  color: card.color,
                  fontSize: '14px', fontWeight: '800',
                  border: `1px solid ${card.color}20`,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}>
                  {card.count} {card.countLabel}
                </div>
                
                <div className="free-res-explore" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  color: card.color, 
                  fontSize: '13px', 
                  fontWeight: '700' 
                }}>
                  Explore Now
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'

export default function StudyMaterialsLandingPage() {
  return (
    <div className="page-container fade-in">


      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px',
        maxWidth: '900px'
      }}>
        {/* Recordings Card */}
        <Link href="/materials/recordings" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: '32px',
            borderRadius: '32px',
            background: '#e8eaf0',
            boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            height: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-6px)'
            e.currentTarget.style.boxShadow = '12px 12px 24px #c5c7cf, -12px -12px 24px #ffffff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
          }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              background: '#e8eaf0',
              boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3636e8'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', marginBottom: '8px' }}>Recordings</h3>
              <p style={{ color: '#9999b0', fontSize: '14px', lineHeight: '1.5' }}>
                Watch previous lecture videos, search by topic, and filter by courses.
              </p>
            </div>
          </div>
        </Link>

        {/* Study Resources Card */}
        <Link href="/materials/resources" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: '32px',
            borderRadius: '32px',
            background: '#e8eaf0',
            boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            height: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-6px)'
            e.currentTarget.style.boxShadow = '12px 12px 24px #c5c7cf, -12px -12px 24px #ffffff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
          }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              background: '#e8eaf0',
              boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3636e8'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', marginBottom: '8px' }}>Study Resources</h3>
              <p style={{ color: '#9999b0', fontSize: '14px', lineHeight: '1.5' }}>
                Access PDFs, notes, documents, and other materials shared for your courses.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

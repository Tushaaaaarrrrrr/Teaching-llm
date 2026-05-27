'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { getDefaultAvatar } from '@/lib/avatar'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  external?: boolean
}

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

function MenuRow({ item, onClick }: { item: MenuItem; onClick?: () => void }) {
  const content = (
    <>
      <div style={{
        width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
        background: item.iconBg, color: item.iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.icon}
      </div>
      <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#1e1e3a' }}>
        {item.label}
      </span>
      {item.external ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
        </svg>
      ) : (
        <ChevronRight />
      )}
    </>
  )
  const baseStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', borderRadius: '18px',
    background: '#e8eaf0',
    boxShadow: '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff',
    textDecoration: 'none', color: '#1e1e3a',
    fontFamily: 'inherit', border: 'none', width: '100%', cursor: 'pointer',
    transition: 'box-shadow 0.15s ease',
  }
  if (onClick) return <button onClick={onClick} style={baseStyle}>{content}</button>
  if (item.external) return <a href={item.href} target="_blank" rel="noopener noreferrer" style={baseStyle}>{content}</a>
  return <Link href={item.href} style={baseStyle}>{content}</Link>
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 800, color: '#9999b0',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '0 6px', margin: '14px 0 8px',
    }}>{children}</div>
  )
}

export default function MobileMenuPage() {
  const router = useRouter()
  const { data: userData } = useSWR('/api/auth/me', (url: string) => fetch(url).then(r => r.json()), {
    revalidateOnFocus: true,
  })

  const user = userData?.user || userData || {}
  const userName: string = user?.name || 'Guest'
  const userRole: string = (user?.role || 'STUDENT').toString()
  // Always use predefined gender-based avatar (custom upload disabled)
  const avatar: string = getDefaultAvatar(user?.gender)
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const roleLabel = userRole.charAt(0) + userRole.slice(1).toLowerCase()

  const txHref = userRole === 'STUDENT' ? '/my-transactions' : '/transactions'

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const generalItems: MenuItem[] = [
    {
      href: '/courses/explore',
      label: 'Store',
      iconBg: 'rgba(99, 102, 241, 0.12)', iconColor: '#6366f1',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    },
    {
      href: txHref,
      label: 'Transactions',
      iconBg: 'rgba(54, 54, 232, 0.10)', iconColor: '#3636e8',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    },
    {
      href: '/support',
      label: 'Support',
      iconBg: 'rgba(16, 185, 129, 0.10)', iconColor: '#10b981',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    },
    {
      href: '/feedback',
      label: 'Course Feedback',
      iconBg: 'rgba(245, 158, 11, 0.12)', iconColor: '#d97706',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    },
  ]

  const infoItems: MenuItem[] = [
    {
      href: '/company/about-us',
      label: 'About Us',
      iconBg: 'rgba(99, 102, 241, 0.10)', iconColor: '#6366f1',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    },
    {
      href: '/company/privacy-policy',
      label: 'Privacy Policy',
      iconBg: 'rgba(14, 165, 233, 0.10)', iconColor: '#0ea5e9',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    },
    {
      href: '/company/terms-and-conditions',
      label: 'Terms & Conditions',
      iconBg: 'rgba(168, 85, 247, 0.10)', iconColor: '#a855f7',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
    },
    {
      href: '/company/refund-policy',
      label: 'Refund Policy',
      iconBg: 'rgba(244, 63, 94, 0.10)', iconColor: '#f43f5e',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
    },
  ]

  const socialItems: MenuItem[] = [
    {
      href: 'https://www.instagram.com/genz_iitian/',
      label: 'Instagram',
      external: true,
      iconBg: 'linear-gradient(135deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888)',
      iconColor: '#ffffff',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    },
    {
      href: 'https://www.youtube.com/@Gen-ZIITian/videos',
      label: 'YouTube',
      external: true,
      iconBg: 'rgba(255, 0, 0, 0.10)', iconColor: '#ff0000',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    },
    {
      href: 'https://www.linkedin.com/company/genz-iitian',
      label: 'LinkedIn',
      external: true,
      iconBg: 'rgba(10, 102, 194, 0.10)', iconColor: '#0a66c2',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.78C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.78 24h20.44C23.2 24 24 23.22 24 22.26V1.74C24 .78 23.2 0 22.22 0z"/></svg>,
    },
    {
      href: 'https://t.me/IIT_madras_Resources',
      label: 'Telegram',
      external: true,
      iconBg: 'rgba(34, 158, 217, 0.10)', iconColor: '#229ed9',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.022c.242-.213-.054-.334-.373-.121L8.48 13.5l-2.94-.918c-.64-.203-.658-.64.135-.945l11.494-4.435c.538-.196 1.006.128.825.945z"/></svg>,
    },
  ]

  return (
    <div className="page-container fade-in mobile-menu-page" style={{ paddingBottom: '24px' }}>
      {/* User info hero card */}
      <Link href="/profile" style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '18px 18px',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #3636e8, #6366f1)',
        boxShadow: '6px 6px 16px rgba(54,54,232,0.25), -6px -6px 14px #ffffff',
        textDecoration: 'none', color: '#fff',
        marginBottom: '6px',
      }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.3)',
        }}>
          <img
            src={avatar}
            alt={userName}
            onError={e => { (e.target as HTMLImageElement).src = '/avatars/default-neutral.png' }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <span style={{ display: 'none', fontSize: '18px', fontWeight: 800 }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.2, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85, fontWeight: 600 }}>
            {roleLabel} · View Profile
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      <SectionHeader>General</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {generalItems.map(item => <MenuRow key={item.href} item={item} />)}
      </div>

      <SectionHeader>Information</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {infoItems.map(item => <MenuRow key={item.href} item={item} />)}
      </div>

      <SectionHeader>Social</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {socialItems.map(item => <MenuRow key={item.href} item={item} />)}
      </div>

      <SectionHeader>Session</SectionHeader>
      <button onClick={handleLogout} style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', borderRadius: '18px',
        background: '#e8eaf0',
        boxShadow: '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff',
        border: 'none', width: '100%', cursor: 'pointer',
        fontFamily: 'inherit', color: '#ef4444',
      }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(239, 68, 68, 0.10)', color: '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, textAlign: 'left' }}>Sign Out</span>
      </button>
    </div>
  )
}

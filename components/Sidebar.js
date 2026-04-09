'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getCurrentRole, getRoleLabel, canAccess } from '../lib/mockAuth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', module: 'dashboard' },
  { href: '/offers', label: 'Offers', module: 'offers' },
  { href: '/onboarding', label: 'Onboarding', module: 'onboarding' },
  { href: '/workers', label: 'Workers', module: 'workers' },
  { href: '/documents', label: 'Documents', module: 'documents' },
  { href: '/certifications', label: 'Certifications', module: 'certifications' },
  { href: '/timesheets', label: 'Timesheets', module: 'timesheets' },
  { href: '/attendance', label: 'Attendance', module: 'attendance' },
  { href: '/payroll', label: 'Payroll', module: 'payroll' },
  { href: '/packs', label: 'Packs', module: 'packs' },
  { href: '/warnings', label: 'Warnings', module: 'warnings' },
  { href: '/leave', label: 'Leave', module: 'leave' },
  { href: '/inbox', label: 'HR Inbox', module: 'inbox' },
  { href: '/blacklist', label: 'Blacklist', module: 'blacklist' },
]

export default function Sidebar({ alertDots = {} }) {
  const pathname = usePathname()
  const role = getCurrentRole()
  const roleLabel = getRoleLabel()
  const visibleItems = navItems.filter(item => canAccess(item.module))

  return (
    <aside className="sidebar">
      <div style={{padding:'16px 16px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
        <svg width="32" height="38" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
            <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#0d9488"/></linearGradient>
            <linearGradient id="sg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
            <linearGradient id="sg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#0d9488"/></linearGradient>
          </defs>
          <circle cx="38" cy="12" r="10" fill="url(#sg1)"/>
          <rect x="20" y="28" width="16" height="70" rx="8" fill="url(#sg2)"/>
          <path d="M36 28 L80 98 L80 28" stroke="url(#sg3)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <rect x="72" y="28" width="16" height="70" rx="8" fill="url(#sg4)"/>
        </svg>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--teal)',lineHeight:1.2}}>Innovation</div>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text)',lineHeight:1.2}}>Technologies</div>
          <div style={{fontSize:9,color:'var(--muted)',lineHeight:1.4}}>Workforce System</div>
        </div>
      </div>
      <div style={{padding:'6px 16px'}}>
        <div className="role-chip">{roleLabel}</div>
      </div>
      <nav className="nav-section">
        {visibleItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const dot = alertDots[item.module] || 'neutral'
          return (
            <Link key={item.href} href={item.href} className={`nav-item${isActive ? ' active' : ''}`}>
              <span style={{flex:1}}>{item.label}</span>
              {dot !== 'neutral' && <span className={`nav-dot ${dot}`} />}
            </Link>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-footer-user">Logged in as {roleLabel}</div>
        <Link href="/">Switch Role</Link>
      </div>
    </aside>
  )
}

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
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="brand-mark">IT</div>
          <div>
            <div className="brand-name">Innovation Technologies</div>
            <div className="brand-sub">Workforce System</div>
          </div>
        </div>
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

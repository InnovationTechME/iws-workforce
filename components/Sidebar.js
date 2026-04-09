'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getRole, canAccess } from '../lib/mockAuth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', module: 'dashboard' },
  { href: '/offers', label: 'Offers', module: 'offers' },
  { href: '/onboarding', label: 'Onboarding', module: 'onboarding' },
  { href: '/offboarding-exit', label: 'Offboarding', module: 'offboarding-exit' },
  { href: '/workers', label: 'Workers', module: 'workers' },
  { href: '/documents', label: 'Documents', module: 'documents' },
  { href: '/certifications', label: 'Certifications', module: 'certifications' },
  { href: '/timesheets', label: 'Timesheets', module: 'timesheets' },
  { href: '/timesheet-reconcile', label: 'Reconciliation', module: 'timesheet-reconcile' },
  { href: '/attendance', label: 'Attendance', module: 'attendance' },
  { href: '/payroll', label: 'Payroll', module: 'payroll' },
  { href: '/payroll-settings', label: 'Payroll Settings', module: 'payroll-settings' },
  { href: '/packs', label: 'Packs', module: 'packs' },
  { href: '/warnings', label: 'Warnings', module: 'warnings' },
  { href: '/leave', label: 'Leave', module: 'leave' },
  { href: '/inbox', label: 'HR Inbox', module: 'inbox' },
  { href: '/blacklist', label: 'Blacklist', module: 'blacklist' },
]

export default function Sidebar({ alertDots = {} }) {
  const pathname = usePathname()
  const [role, setRoleState] = useState('owner')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setRoleState(getRole())
  }, [])

  const roleLabel = role === 'owner' ? 'Owner' : role === 'hr_admin' ? 'HR Admin' : 'Operations'
  const visibleItems = mounted ? navItems.filter(item => canAccess(item.module)) : navItems

  return (
    <aside className="sidebar">
      <div style={{padding:'16px 16px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Innovation Technologies" style={{width:36,height:36,objectFit:'contain',flexShrink:0}} />
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--teal)',lineHeight:1.2}}>Innovation</div>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text)',lineHeight:1.2}}>Technologies</div>
          <div style={{fontSize:9,color:'var(--muted)',lineHeight:1.4}}>Workforce System</div>
        </div>
      </div>
      {mounted && (
        <div style={{padding:'6px 16px'}}>
          <div className="role-chip">{roleLabel}</div>
        </div>
      )}
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
        {mounted && <div className="sidebar-footer-user">Logged in as {roleLabel}</div>}
        <Link href="/">Switch Role</Link>
      </div>
    </aside>
  )
}

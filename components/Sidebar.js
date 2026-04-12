'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getRole, canAccess } from '../lib/mockAuth'

const navSections = [
  { title:null, items:[
    { href:'/dashboard', label:'Dashboard', module:'dashboard' },
  ]},
  { title:'WORKER LIFECYCLE', items:[
    { href:'/offers', label:'Offers', module:'offers' },
    { href:'/onboarding', label:'Onboarding', module:'onboarding' },
    { href:'/workers', label:'Workers', module:'workers' },
    { href:'/suppliers', label:'Suppliers', module:'suppliers' },
    { href:'/offboarding-exit', label:'Worker Exit', module:'offboarding-exit' },
    { href:'/blacklist', label:'Blacklist', module:'blacklist' },
  ]},
  { title:'COMPLIANCE & DOCUMENTS', items:[
    { href:'/documents', label:'Documents', module:'documents' },
    { href:'/certifications', label:'Certifications', module:'certifications' },
    { href:'/packs', label:'Document Packs', module:'packs' },
  ]},
  { title:'HR MANAGEMENT', items:[
    { href:'/warnings', label:'Disciplinary Records', module:'warnings' },
    { href:'/leave', label:'Leave Requests', module:'leave' },
    { href:'/attendance', label:'Attendance', module:'attendance' },
    { href:'/inbox', label:'HR Inbox', module:'inbox' },
  ]},
  { title:'TIMESHEETS & PAYROLL', items:[
    { href:'/timesheets', label:'Timesheets', module:'timesheets' },
    { href:'/timesheet-reconcile', label:'Reconciliation', module:'timesheet-reconcile' },
    { href:'/payroll-run', label:'⚡ Run Payroll', module:'payroll-run' },
    { href:'/payroll', label:'Payroll', module:'payroll' },
    { href:'/payroll-settings', label:'Payroll Settings', module:'payroll-settings' },
  ]},
  { title:'OTHER', items:[
    { href:'/approvals', label:'Pending Approvals', module:'approvals' },
  ]},
]

export default function Sidebar({ alertDots = {} }) {
  const pathname = usePathname()
  const [role, setRoleState] = useState('owner')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true); setRoleState(getRole()) }, [])

  const roleLabel = role === 'owner' ? 'Management' : role === 'hr_admin' ? 'HR Admin' : 'Operations'

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
      {mounted && <div style={{padding:'6px 16px'}}><div className="role-chip">{roleLabel}</div></div>}
      <nav className="nav-section" style={{padding:'4px 8px'}}>
        {navSections.map((section, si) => (
          <div key={si} style={{marginBottom:section.title ? 12 : 4}}>
            {section.title && <div style={{fontSize:9,fontWeight:700,color:'var(--hint)',textTransform:'uppercase',letterSpacing:'0.8px',padding:'8px 10px 4px',marginTop:si>0?4:0}}>{section.title}</div>}
            {section.items.filter(item => !mounted || canAccess(item.module)).map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const dot = alertDots[item.module] || 'neutral'
              return (
                <Link key={item.href} href={item.href} className={`nav-item${isActive ? ' active' : ''}`}>
                  <span style={{flex:1}}>{item.label}</span>
                  {dot !== 'neutral' && <span className={`nav-dot ${dot}`} />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        {mounted && <div className="sidebar-footer-user">Logged in as {roleLabel}</div>}
        <Link href="/">Switch Role</Link>
      </div>
    </aside>
  )
}

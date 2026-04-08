'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { getDashboardMetrics, getInboxItems, getPayrollBatch } from '../../lib/mockStore'
import { getCurrentRole, canAccess } from '../../lib/mockAuth'
import { formatDate } from '../../lib/utils'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null)
  const [inbox, setInbox] = useState(null)
  const [batch, setBatch] = useState(null)
  const [role, setRole] = useState('owner')

  useEffect(() => {
    setMetrics(getDashboardMetrics())
    setInbox(getInboxItems())
    setBatch(getPayrollBatch())
    setRole(getCurrentRole())
  }, [])

  if (!metrics || !inbox) return null

  const urgentItems = [
    ...inbox.expiredDocs.slice(0,3).map(d => ({ id:d.id, worker:d.worker_name, issue:`${d.document_type} expired`, type:'expired doc', tone:'danger', href:'/documents' })),
    ...inbox.missingDocs.slice(0,2).map(d => ({ id:d.id, worker:d.worker_name, issue:`${d.document_type} missing`, type:'missing doc', tone:'danger', href:'/documents' })),
    ...inbox.expiredCerts.slice(0,2).map(c => ({ id:c.id, worker:c.worker_name, issue:`${c.certification_type} expired`, type:'cert expired', tone:'danger', href:'/certifications' })),
    ...inbox.openWarnings.slice(0,2).map(w => ({ id:w.id, worker:w.worker_name, issue:w.reason?.slice(0,60), type:'warning', tone:'warning', href:'/warnings' })),
    ...inbox.contractsDue.slice(0,2).map(d => ({ id:d.id, worker:d.worker_name, issue:`Contract renewal due`, type:'contract', tone:'warning', href:'/documents' })),
  ].slice(0,10)

  return (
    <AppShell pageTitle="Dashboard">
      <PageHeader
        eyebrow="Dashboard"
        title="Workforce operations"
        description="Daily HR follow-up, approvals, and urgent actions."
        actions={
          <div style={{display:'flex',gap:8}}>
            <Link href="/offers" className="btn btn-teal">+ New Offer</Link>
            <Link href="/inbox" className="btn btn-secondary">HR Inbox ({Object.values(inbox).reduce((s,a)=>s+a.length,0)})</Link>
          </div>
        }
      />

      <div className="summary-strip">
        <StatCard label="Active workers" value={metrics.activeWorkers} tone="teal" helper={`${metrics.subcontractors} subcontractors`} />
        <StatCard label="Expired docs" value={metrics.expiredDocs + metrics.missingDocs} tone={metrics.expiredDocs + metrics.missingDocs > 0 ? 'danger' : ''} helper={`${metrics.missingDocs} missing`} />
        <StatCard label="Expiring soon" value={metrics.expiringDocs + metrics.expiringCerts} tone={metrics.expiringDocs + metrics.expiringCerts > 0 ? 'warning' : ''} helper="within 30 days" />
        <StatCard label="Open warnings" value={metrics.openWarnings} tone={metrics.openWarnings > 0 ? 'danger' : ''} helper="requiring follow-up" />
      </div>

      <div className="summary-strip">
        <StatCard label="Pending approvals" value={metrics.pendingApprovals} tone={metrics.pendingApprovals > 0 ? 'warning' : ''} helper="timesheets" />
        <StatCard label="Pack blockers" value={metrics.packBlockers} tone={metrics.packBlockers > 0 ? 'warning' : ''} helper="workers not pack-ready" />
        <StatCard label="Onboarding active" value={metrics.onboardingActive} tone="info" helper="in progress" />
        {canAccess('payroll') && <StatCard label="Payroll batch" value={batch?.status || '-'} tone="neutral" helper={batch?.month_label || ''} />}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Daily follow-up queue</h2>
            <p>Top urgent items requiring action today</p>
          </div>
          <Link href="/inbox" className="btn btn-ghost btn-sm">View all →</Link>
        </div>
        {urgentItems.length === 0 ? (
          <div className="empty-state">
            <h3>All clear</h3>
            <p>No urgent follow-up items today.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Issue</th>
                  <th>Type</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {urgentItems.map((item, i) => (
                  <tr key={item.id + i}>
                    <td style={{fontWeight:500}}>{item.worker}</td>
                    <td style={{color:'var(--muted)'}}>{item.issue}</td>
                    <td><StatusBadge label={item.type} tone={item.tone} /></td>
                    <td><Link href={item.href} className="btn btn-secondary btn-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="panel">
          <div className="panel-header">
            <div><h2>Document alerts</h2><p>Expired and missing records</p></div>
            <Link href="/documents" className="btn btn-ghost btn-sm">View →</Link>
          </div>
          {inbox.expiredDocs.slice(0,4).map(d => (
            <div key={d.id} className="metric-row">
              <span className="label">{d.worker_name} · {d.document_type}</span>
              <StatusBadge label="expired" tone="danger" />
            </div>
          ))}
          {inbox.missingDocs.slice(0,3).map(d => (
            <div key={d.id} className="metric-row">
              <span className="label">{d.worker_name} · {d.document_type}</span>
              <StatusBadge label="missing" tone="danger" />
            </div>
          ))}
          {inbox.expiredDocs.length === 0 && inbox.missingDocs.length === 0 && <p style={{fontSize:13,color:'var(--hint)',padding:'8px 0'}}>No expired or missing documents.</p>}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div><h2>Certification alerts</h2><p>Expired and expiring certifications</p></div>
            <Link href="/certifications" className="btn btn-ghost btn-sm">View →</Link>
          </div>
          {inbox.expiredCerts.slice(0,4).map(c => (
            <div key={c.id} className="metric-row">
              <span className="label">{c.worker_name} · {c.certification_type}</span>
              <StatusBadge label="expired" tone="danger" />
            </div>
          ))}
          {inbox.expiringCerts.slice(0,3).map(c => (
            <div key={c.id} className="metric-row">
              <span className="label">{c.worker_name} · {c.certification_type}</span>
              <StatusBadge label="expiring soon" tone="warning" />
            </div>
          ))}
          {inbox.expiredCerts.length === 0 && inbox.expiringCerts.length === 0 && <p style={{fontSize:13,color:'var(--hint)',padding:'8px 0'}}>No certification issues.</p>}
        </div>
      </div>
    </AppShell>
  )
}

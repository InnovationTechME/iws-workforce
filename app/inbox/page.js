'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getInboxItems } from '../../lib/mockStore'
import { formatDate } from '../../lib/utils'

function InboxPanel({ title, items, tone, linkHref, renderItem }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div><h2>{title}</h2><p>{items.length} items</p></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <StatusBadge label={String(items.length)} tone={items.length > 0 ? tone : 'success'} />
          {linkHref && <Link href={linkHref} className="btn btn-ghost btn-sm">View →</Link>}
        </div>
      </div>
      {items.length === 0 ? <div style={{padding:'8px 0',fontSize:13,color:'var(--hint)'}}>All clear</div> : (
        <div style={{display:'flex',flexDirection:'column',gap:0}}>
          {items.slice(0,5).map((item,i) => <div key={i} className="metric-row" style={{cursor:item._href?'pointer':'default'}} onClick={() => item._href && (window.location.href = item._href)}>{renderItem(item)}</div>)}
          {items.length > 5 && <Link href={linkHref||'#'} style={{fontSize:12,color:'var(--teal)',paddingTop:8,display:'block'}}>+{items.length - 5} more →</Link>}
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  const [inbox, setInbox] = useState(null)
  const router = useRouter()

  useEffect(() => { setInbox(getInboxItems()) }, [])

  if (!inbox) return null

  const total = Object.values(inbox).reduce((s,a) => s + a.length, 0)

  // Add click hrefs to document items
  const missingDocs = inbox.missingDocs.map(d => ({...d, _href:'/documents'}))
  const expiredDocs = inbox.expiredDocs.map(d => ({...d, _href:'/documents'}))
  const expiringDocs = inbox.expiringDocs.map(d => ({...d, _href:'/documents'}))
  const contractsDue = inbox.contractsDue.map(d => ({...d, _href:'/documents'}))
  const expiredCerts = inbox.expiredCerts.map(c => ({...c, _href:'/certifications'}))
  const expiringCerts = inbox.expiringCerts.map(c => ({...c, _href:'/certifications'}))

  return (
    <AppShell pageTitle="HR Inbox">
      <PageHeader eyebrow="HR Inbox" title="Daily follow-up queue" description="All active HR alerts consolidated in one place. Click any item to take action."
        meta={<StatusBadge label={`${total} total items`} tone={total > 0 ? 'danger' : 'success'} />} />

      {total === 0 && <div className="panel"><div className="empty-state"><h3>All clear — no HR follow-up items</h3><p>Great work. Everything is up to date.</p></div></div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <InboxPanel title="Missing documents" items={missingDocs} tone="danger" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · {d.document_type}</div><div style={{fontSize:10,color:'var(--danger)',marginTop:2}}>Click to upload →</div></div><StatusBadge label="missing" tone="danger" /></>} />
        <InboxPanel title="Expired documents" items={expiredDocs} tone="danger" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · {d.document_type}</div><div style={{fontSize:10,color:'var(--danger)',marginTop:2}}>Expired {formatDate(d.expiry_date)} — Click to renew →</div></div><StatusBadge label="expired" tone="danger" /></>} />
        <InboxPanel title="Expiring documents" items={expiringDocs} tone="warning" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · {d.document_type}</div><div style={{fontSize:10,color:'var(--warning)',marginTop:2}}>Expires {formatDate(d.expiry_date)} — Click to renew →</div></div></>} />
        <InboxPanel title="Contracts due" items={contractsDue} tone="warning" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · contract renewal</div><div style={{fontSize:10,color:'var(--warning)',marginTop:2}}>Due {formatDate(d.expiry_date)} →</div></div></>} />
        <InboxPanel title="Expired certifications" items={expiredCerts} tone="danger" linkHref="/certifications" renderItem={c => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{c.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{c.worker_number} · {c.certification_type}</div><div style={{fontSize:10,color:'var(--danger)',marginTop:2}}>Click to renew →</div></div><StatusBadge label="expired" tone="danger" /></>} />
        <InboxPanel title="Expiring certifications" items={expiringCerts} tone="warning" linkHref="/certifications" renderItem={c => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{c.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{c.worker_number} · {c.certification_type}</div><div style={{fontSize:10,color:'var(--warning)',marginTop:2}}>Expires {formatDate(c.expiry_date)} →</div></div></>} />
        <InboxPanel title="Open warnings" items={inbox.openWarnings} tone="danger" linkHref="/warnings" renderItem={w => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{w.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{w.worker_number} · {w.warning_type}</div></div><StatusBadge label="open" tone="danger" /></>} />
        <InboxPanel title="Pending timesheets" items={inbox.pendingTimesheets} tone="warning" linkHref="/timesheets" renderItem={t => <><span className="label">{t.client_name} · {t.job_no}</span><StatusBadge label={t.final_approval_status} tone="warning" /></>} />
        <InboxPanel title="Leave requests" items={inbox.leaveRequests} tone="warning" linkHref="/leave" renderItem={l => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{l.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{l.worker_number} · {l.leave_type} · {l.days_count} days</div></div><StatusBadge label="pending" tone="warning" /></>} />
        <InboxPanel title="C3 card requests" items={inbox.pendingTasks || []} tone="warning" linkHref="/workers" renderItem={t => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{t.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{t.worker_number}</div></div><StatusBadge label="C3 pending" tone="warning" /></>} />
        <InboxPanel title="Timesheet discrepancies" items={inbox.pendingDiscrepancies || []} tone="danger" linkHref="/timesheet-reconcile" renderItem={d => <><span className="label">{d.iws_worker_name} · {Math.abs(d.difference)}h diff</span><StatusBadge label="pending" tone="danger" /></>} />
      </div>
    </AppShell>
  )
}

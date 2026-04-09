'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getInboxItems } from '../../lib/mockStore'
import { formatDate } from '../../lib/utils'

function InboxPanel({ title, items, tone, linkHref, linkLabel, renderItem }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div><h2>{title}</h2><p>{items.length} items</p></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <StatusBadge label={String(items.length)} tone={items.length > 0 ? tone : 'success'} />
          {linkHref && <Link href={linkHref} className="btn btn-ghost btn-sm">{linkLabel || 'View →'}</Link>}
        </div>
      </div>
      {items.length === 0 ? <div style={{padding:'8px 0',fontSize:13,color:'var(--hint)'}}>All clear</div> : (
        <div style={{display:'flex',flexDirection:'column',gap:0}}>
          {items.slice(0,5).map((item,i) => <div key={i} className="metric-row">{renderItem(item)}</div>)}
          {items.length > 5 && <div style={{fontSize:12,color:'var(--hint)',paddingTop:8}}>+{items.length - 5} more</div>}
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  const [inbox, setInbox] = useState(null)

  useEffect(() => { setInbox(getInboxItems()) }, [])

  if (!inbox) return null

  const total = Object.values(inbox).reduce((s,a) => s + a.length, 0)

  return (
    <AppShell pageTitle="HR Inbox">
      <PageHeader eyebrow="HR Inbox" title="Daily follow-up queue" description="All active HR alerts consolidated in one place."
        meta={<StatusBadge label={`${total} total items`} tone={total > 0 ? 'danger' : 'success'} />} />

      {total === 0 && <div className="panel"><div className="empty-state"><h3>All clear — no HR follow-up items</h3><p>Great work. Everything is up to date.</p></div></div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <InboxPanel title="Missing documents" items={inbox.missingDocs} tone="danger" linkHref="/documents" renderItem={d => <><span className="label">{d.worker_id} · {d.document_type}</span><StatusBadge label="missing" tone="danger" /></>} />
        <InboxPanel title="Expired documents" items={inbox.expiredDocs} tone="danger" linkHref="/documents" renderItem={d => <><span className="label">{d.worker_id} · {d.document_type}</span><StatusBadge label="expired" tone="danger" /></>} />
        <InboxPanel title="Expiring documents" items={inbox.expiringDocs} tone="warning" linkHref="/documents" renderItem={d => <><span className="label">{d.worker_id} · {d.document_type}</span><span className="value" style={{fontSize:11}}>{formatDate(d.expiry_date)}</span></>} />
        <InboxPanel title="Contracts due" items={inbox.contractsDue} tone="warning" linkHref="/documents" renderItem={d => <><span className="label">{d.worker_id} · contract</span><span className="value" style={{fontSize:11}}>{formatDate(d.expiry_date)}</span></>} />
        <InboxPanel title="Expired certifications" items={inbox.expiredCerts} tone="danger" linkHref="/certifications" renderItem={c => <><span className="label">{c.worker_id} · {c.certification_type}</span><StatusBadge label="expired" tone="danger" /></>} />
        <InboxPanel title="Expiring certifications" items={inbox.expiringCerts} tone="warning" linkHref="/certifications" renderItem={c => <><span className="label">{c.worker_id} · {c.certification_type}</span><span className="value" style={{fontSize:11}}>{formatDate(c.expiry_date)}</span></>} />
        <InboxPanel title="Open warnings" items={inbox.openWarnings} tone="danger" linkHref="/warnings" renderItem={w => <><span className="label">{w.worker_name} · {w.warning_type}</span><StatusBadge label="open" tone="danger" /></>} />
        <InboxPanel title="Pending timesheets" items={inbox.pendingTimesheets} tone="warning" linkHref="/timesheets" renderItem={t => <><span className="label">{t.client_name} · {t.job_no}</span><StatusBadge label={t.final_approval_status} tone="warning" /></>} />
        <InboxPanel title="Leave requests" items={inbox.leaveRequests} tone="warning" linkHref="/leave" renderItem={l => <><span className="label">{l.worker_name} · {l.leave_type}</span><StatusBadge label="pending" tone="warning" /></>} />
        <InboxPanel title="C3 card requests pending" items={inbox.pendingTasks || []} tone="warning" linkHref="/workers" renderItem={t => <><span className="label">{t.worker_name} · {t.worker_number}</span><StatusBadge label="C3 pending" tone="warning" /></>} />
      </div>
    </AppShell>
  )
}

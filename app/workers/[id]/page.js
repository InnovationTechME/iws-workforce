'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '../../../components/AppShell'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'
import { getWorker, getDocumentsByWorker, getCertificationsByWorker, getWarningsByWorker, getLeaveByWorker } from '../../../lib/mockStore'
import { formatCurrency, formatDate, getStatusTone } from '../../../lib/utils'

export default function WorkerDetailPage() {
  const { id } = useParams()
  const [worker, setWorker] = useState(null)
  const [docs, setDocs] = useState([])
  const [certs, setCerts] = useState([])
  const [warnings, setWarnings] = useState([])
  const [tab, setTab] = useState('profile')

  useEffect(() => {
    const w = getWorker(id)
    setWorker(w)
    if (w) {
      setDocs(getDocumentsByWorker(id))
      setCerts(getCertificationsByWorker(id))
      setWarnings(getWarningsByWorker(id))
    }
  }, [id])

  if (!worker) return <AppShell pageTitle="Worker"><div className="page-shell"><div className="panel"><div className="empty-state"><h3>Worker not found</h3></div></div></div></AppShell>

  const expiredDocs = docs.filter(d => d.status === 'expired' || d.status === 'missing').length
  const expiringDocs = docs.filter(d => d.status === 'expiring_soon').length
  const expiredCerts = certs.filter(c => c.status === 'expired').length

  return (
    <AppShell pageTitle={worker.full_name}>
      <PageHeader eyebrow="Worker detail" title={worker.full_name}
        description={`${worker.worker_number} · ${worker.category} · ${worker.trade_role}`}
        actions={<div style={{display:'flex',gap:8}}><Link href="/workers" className="btn btn-secondary">← Workers</Link></div>}
        meta={<StatusBadge label={worker.status} tone={getStatusTone(worker.status)} />} />

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{worker.payroll_type === 'monthly' ? formatCurrency(worker.monthly_salary) : formatCurrency(worker.hourly_rate) + '/hr'}</div><div className="lbl">Compensation</div></div>
        <div className="stat-card"><div className={`num ${expiredDocs > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{expiredDocs}</div><div className="lbl">Doc issues</div></div>
        <div className="stat-card"><div className={`num ${expiredCerts > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{expiredCerts}</div><div className="lbl">Cert issues</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{warnings.filter(w=>w.status==='open').length}</div><div className="lbl">Open warnings</div></div>
      </div>

      <div className="panel">
        <div className="tabs">
          {['profile','documents','certifications','warnings'].map(t => <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        {tab === 'profile' && (
          <div className="form-grid">
            {[['Full name',worker.full_name],['Worker number',worker.worker_number],['Category',worker.category],['Trade / role',worker.trade_role],['Nationality',worker.nationality],['Passport',worker.passport_number],['Mobile',worker.mobile_number],['Email',worker.email],['Visa company',worker.visa_company],['Project site',worker.project_site],['Joining date',formatDate(worker.joining_date)],['Onboarding status',worker.onboarding_status]].map(([label,value]) => (
              <div key={label}>
                <div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>{label}</div>
                <div style={{fontSize:13,fontWeight:500}}>{value || '—'}</div>
              </div>
            ))}
            {worker.category === 'Subcontractor' && <>
              <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Subcontractor company</div><div style={{fontSize:13,fontWeight:500}}>{worker.subcontractor_company || '—'}</div></div>
              <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Billing rate</div><div style={{fontSize:13,fontWeight:500}}>{worker.subcontractor_billing_rate ? formatCurrency(worker.subcontractor_billing_rate) + '/hr' : '—'}</div></div>
              <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Cost rate</div><div style={{fontSize:13,fontWeight:500}}>{worker.subcontractor_cost_rate ? formatCurrency(worker.subcontractor_cost_rate) + '/hr' : '—'}</div></div>
            </>}
          </div>
        )}

        {tab === 'documents' && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Category</th><th>Issue date</th><th>Expiry</th><th>Status</th></tr></thead>
              <tbody>
                {docs.length === 0 ? <tr><td colSpan={5} style={{textAlign:'center',color:'var(--hint)',padding:32}}>No documents recorded</td></tr> : docs.map(d => (
                  <tr key={d.id}>
                    <td style={{fontWeight:500}}>{d.document_type}</td>
                    <td><StatusBadge label={d.document_category} tone="neutral" /></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(d.issue_date)}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(d.expiry_date)}</td>
                    <td><StatusBadge label={d.status} tone={getStatusTone(d.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'certifications' && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Certification</th><th>Issuer</th><th>Expiry</th><th>Status</th></tr></thead>
              <tbody>
                {certs.length === 0 ? <tr><td colSpan={4} style={{textAlign:'center',color:'var(--hint)',padding:32}}>No certifications recorded</td></tr> : certs.map(c => (
                  <tr key={c.id}>
                    <td style={{fontWeight:500}}>{c.certification_type}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{c.issuer}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(c.expiry_date)}</td>
                    <td><StatusBadge label={c.status} tone={getStatusTone(c.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'warnings' && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Date</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {warnings.length === 0 ? <tr><td colSpan={4} style={{textAlign:'center',color:'var(--hint)',padding:32}}>No warnings recorded</td></tr> : warnings.map(w => (
                  <tr key={w.id}>
                    <td><StatusBadge label={w.warning_type} tone={w.warning_type==='warning'?'danger':'neutral'} /></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(w.issue_date)}</td>
                    <td style={{fontSize:13}}>{w.reason}</td>
                    <td><StatusBadge label={w.status} tone={getStatusTone(w.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}

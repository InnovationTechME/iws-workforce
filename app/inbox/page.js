'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getInboxItems, getDocumentsByWorker, getWorker, updateDocument, addDocument, getCertifications, updateCertification, checkNonReturnStatus } from '../../lib/mockStore'
import { getTasks } from '../../lib/taskService'
import { getInsuranceExpiryAlerts } from '../../lib/documentService'
import { formatDate, getStatusTone } from '../../lib/utils'

const CATEGORY_MAP = {
  passport:'personal', emirates_id:'personal', photo:'personal', cv:'personal',
  offer_letter:'employment', employment_contract:'employment', labour_card:'employment', labour_permit:'employment', bank_account_details:'employment',
  medical_insurance:'compliance', workers_compensation:'compliance', medical_fitness:'compliance', unemployment_insurance:'compliance',
  site_induction:'site', safety_orientation:'site', site_access_card:'site',
  subcontractor_agreement:'subcontractor', subcontractor_trade_licence:'subcontractor', subcontractor_insurance:'subcontractor',
  resignation_letter:'termination', termination_notice:'termination', eos_calculation:'termination', exit_clearance:'termination', experience_letter:'termination'
}

const EXPIRY_HINTS = {
  passport: 'Passports are typically valid 5\u201310 years',
  emirates_id: 'Emirates ID valid 3 years',
  medical_insurance: 'Insurance typically annual',
  labour_card: 'Labour card follows visa expiry'
}

const EMPTY_INBOX = {
  missingDocs: [],
  expiredDocs: [],
  expiringDocs: [],
  contractsDue: [],
  expiredCerts: [],
  expiringCerts: [],
  openWarnings: [],
  pendingTimesheets: [],
  leaveRequests: [],
  pendingTasks: [],
  pendingDiscrepancies: [],
}

function normaliseInbox(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    Object.entries(EMPTY_INBOX).map(([key, fallback]) => [
      key,
      Array.isArray(source[key]) ? source[key] : fallback,
    ])
  )
}

function titleCase(str) {
  return (str || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function calcStatus(expiryDate) {
  if (!expiryDate) return 'missing'
  const exp = new Date(expiryDate)
  const today = new Date()
  const days = Math.ceil((exp - today) / (1000*60*60*24))
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'valid'
}

function daysFromNow(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000*60*60*24))
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function twoYearsFromStr(dateStr) {
  const d = new Date(dateStr || new Date())
  d.setFullYear(d.getFullYear() + 2)
  return d.toISOString().split('T')[0]
}

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
          {items.slice(0,5).map((item,i) => <div key={i} className="metric-row" style={{cursor:'pointer'}} onClick={() => item._action && item._action()}>{renderItem(item)}</div>)}
          {items.length > 5 && <Link href={linkHref||'#'} style={{fontSize:12,color:'var(--teal)',paddingTop:8,display:'block'}}>+{items.length - 5} more →</Link>}
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  const [inbox, setInbox] = useState(EMPTY_INBOX)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState(null)
  const [drawerRecord, setDrawerRecord] = useState(null)
  const [drawerWorker, setDrawerWorker] = useState(null)
  const [drawerForm, setDrawerForm] = useState({ issue_date:'', expiry_date:'', notes:'', file: null })
  const [renewIssuer, setRenewIssuer] = useState('')
  const [successMsg, setSuccessMsg] = useState(null)

  const [tasks, setTasks] = useState([])
  const [insuranceAlerts, setInsuranceAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        setInbox(normaliseInbox(getInboxItems()))
        const [rows, alerts] = await Promise.all([getTasks(), getInsuranceExpiryAlerts()])
        if (!cancelled) {
          setTasks(rows || [])
          setInsuranceAlerts(alerts || [])
        }
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load inbox')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const refreshInbox = async () => {
    setInbox(normaliseInbox(getInboxItems()))
    try { setTasks(await getTasks()) } catch (err) { setLoadError(err?.message || 'Failed to refresh inbox') }
  }

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setDrawerType(null)
    setDrawerRecord(null)
    setDrawerWorker(null)
    setDrawerForm({ issue_date:'', expiry_date:'', notes:'', file: null })
    setRenewIssuer('')
  }

  const openDocDrawer = (workerId, docType, prefill) => {
    const worker = getWorker(workerId)
    const docs = getDocumentsByWorker(workerId)
    let record = docs.find(d => d.document_type === docType)
    if (!record) record = { worker_id: workerId, document_type: docType, status: 'missing', issue_date: null, expiry_date: null }
    setDrawerWorker(worker)
    setDrawerRecord(record)
    setDrawerType('document')
    setDrawerForm({
      issue_date: prefill?.issue_date || todayStr(),
      expiry_date: prefill?.expiry_date || '',
      notes: record.notes || '',
      file: null
    })
    setDrawerOpen(true)
  }

  const openCertDrawer = (workerId, certType) => {
    const worker = getWorker(workerId)
    const certs = getCertifications()
    const record = certs.find(c => c.worker_id === workerId && c.certification_type === certType)
    if (!record) return
    setDrawerWorker(worker)
    setDrawerRecord(record)
    setDrawerType('certification')
    setRenewIssuer(record.issuer || '')
    setDrawerForm({
      issue_date: todayStr(),
      expiry_date: '',
      notes: '',
      file: null
    })
    setDrawerOpen(true)
  }

  const handleSaveDocument = () => {
    if (!drawerForm.expiry_date) return
    const status = calcStatus(drawerForm.expiry_date)
    const ext = drawerForm.file ? drawerForm.file.name.split('.').pop() : 'pdf'
    const fileName = `${drawerWorker.worker_number}_${drawerWorker.full_name.replace(/\s+/g,'_')}_${drawerRecord.document_type}.${ext}`
    const payload = {
      issue_date: drawerForm.issue_date,
      expiry_date: drawerForm.expiry_date,
      notes: drawerForm.notes,
      status,
      file_name: drawerForm.file ? fileName : (drawerRecord.file_name || null)
    }
    if (drawerRecord.id) {
      updateDocument(drawerRecord.id, payload)
    } else {
      addDocument({
        worker_id: drawerRecord.worker_id,
        document_type: drawerRecord.document_type,
        category: CATEGORY_MAP[drawerRecord.document_type] || 'personal',
        ...payload
      })
    }
    refreshInbox()
    const label = titleCase(drawerRecord.document_type)
    showSuccess(`\u2713 ${label} updated for ${drawerWorker.full_name}`)
    closeDrawer()
  }

  const handleSaveCertification = () => {
    if (!drawerForm.expiry_date) return
    const status = calcStatus(drawerForm.expiry_date)
    const ext = drawerForm.file ? drawerForm.file.name.split('.').pop() : 'pdf'
    const fileName = drawerForm.file ? `${drawerWorker.worker_number}_${drawerWorker.full_name.replace(/\s+/g,'_')}_${drawerRecord.certification_type.replace(/\s+/g,'_')}.${ext}` : (drawerRecord.file_name || null)
    updateCertification(drawerRecord.id, {
      issuer: renewIssuer,
      issue_date: drawerForm.issue_date,
      expiry_date: drawerForm.expiry_date,
      file_name: fileName,
      renewal_required: false,
      status
    })
    refreshInbox()
    showSuccess(`\u2713 ${drawerRecord.certification_type} updated for ${drawerWorker.full_name}`)
    closeDrawer()
  }

  const safeInbox = normaliseInbox(inbox)
  const total = Object.values(safeInbox).reduce((s,a) => s + a.length, 0)

  // Wire action links to open drawer
  const missingDocs = safeInbox.missingDocs.map(d => ({...d, _action: () => openDocDrawer(d.worker_id, d.document_type)}))
  const expiredDocs = safeInbox.expiredDocs.map(d => ({...d, _action: () => openDocDrawer(d.worker_id, d.document_type)}))
  const expiringDocs = safeInbox.expiringDocs.map(d => ({...d, _action: () => openDocDrawer(d.worker_id, d.document_type)}))
  const contractsDue = safeInbox.contractsDue.map(d => ({...d, _action: () => openDocDrawer(d.worker_id, 'employment_contract', { issue_date: todayStr(), expiry_date: twoYearsFromStr(todayStr()) })}))
  const expiredCerts = safeInbox.expiredCerts.map(c => ({...c, _action: () => openCertDrawer(c.worker_id, c.certification_type)}))
  const expiringCerts = safeInbox.expiringCerts.map(c => ({...c, _action: () => openCertDrawer(c.worker_id, c.certification_type)}))

  const isContract = drawerRecord?.document_type === 'employment_contract'
  const days = drawerRecord ? daysFromNow(drawerRecord.expiry_date) : null

  return (
    <>
    <AppShell pageTitle="HR Inbox">
      {successMsg && <div style={{background:'#ecfdf5',border:'1px solid #6ee7b7',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,fontWeight:500,color:'#065f46'}}>{successMsg}</div>}

      <PageHeader eyebrow="HR Inbox" title="Daily follow-up queue" description="All active HR alerts consolidated in one place. Click any item to take action."
        meta={<StatusBadge label={`${total} total items`} tone={total > 0 ? 'danger' : 'success'} />} />

      {total === 0 && <div className="panel"><div className="empty-state"><h3>All clear — no HR follow-up items</h3><p>Great work. Everything is up to date.</p></div></div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <InboxPanel title="Missing documents" items={missingDocs} tone="danger" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · {d.document_type}</div><div style={{fontSize:10,color:'var(--danger)',marginTop:2}}>📎 Upload document →</div></div><StatusBadge label="missing" tone="danger" /></>} />
        <InboxPanel title="Expired documents" items={expiredDocs} tone="danger" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · {d.document_type}</div><div style={{fontSize:10,color:'var(--danger)',marginTop:2}}>🔄 Upload renewal →</div></div><StatusBadge label="expired" tone="danger" /></>} />
        <InboxPanel title="Expiring documents" items={expiringDocs} tone="warning" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · {d.document_type}</div><div style={{fontSize:10,color:'var(--warning)',marginTop:2}}>⏰ Renew before expiry →</div></div></>} />
        <InboxPanel title="Contracts due" items={contractsDue} tone="warning" linkHref="/documents" renderItem={d => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{d.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{d.worker_number} · contract renewal</div><div style={{fontSize:10,color:'var(--warning)',marginTop:2}}>📋 Renew contract →</div></div></>} />
        <InboxPanel title="Expired certifications" items={expiredCerts} tone="danger" linkHref="/certifications" renderItem={c => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{c.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{c.worker_number} · {c.certification_type}</div><div style={{fontSize:10,color:'var(--danger)',marginTop:2}}>🔄 Upload new certificate →</div></div><StatusBadge label="expired" tone="danger" /></>} />
        <InboxPanel title="Expiring certifications" items={expiringCerts} tone="warning" linkHref="/certifications" renderItem={c => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{c.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{c.worker_number} · {c.certification_type}</div><div style={{fontSize:10,color:'var(--warning)',marginTop:2}}>⏰ Renew certificate →</div></div></>} />
        <InboxPanel title="Open warnings" items={safeInbox.openWarnings} tone="danger" linkHref="/warnings" renderItem={w => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{w.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{w.worker_number} · {w.warning_type}</div></div><StatusBadge label="open" tone="danger" /></>} />
        <InboxPanel title="Pending timesheets" items={safeInbox.pendingTimesheets} tone="warning" linkHref="/timesheets" renderItem={t => <><span className="label">{t.client_name} · {t.job_no}</span><StatusBadge label={t.final_approval_status} tone="warning" /></>} />
        <InboxPanel title="Leave requests" items={safeInbox.leaveRequests} tone="warning" linkHref="/leave" renderItem={l => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{l.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{l.worker_number} · {l.leave_type} · {l.days_count} days</div>{l.leave_type==='sick'&&<div style={{fontSize:10,color:'var(--warning)',marginTop:2}}>⚠ Verify certificate before approving</div>}</div><StatusBadge label="pending" tone="warning" /></>} />
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 14px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#0f172a',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Sick Leave Certificate Verification</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:6}}>
            <a href="https://www.tamm.abudhabi/wb/doh/sick-leave-validation" target="_blank" rel="noopener noreferrer" style={{padding:'5px 9px',background:'#0d9488',color:'white',borderRadius:5,textDecoration:'none',fontSize:10,fontWeight:600}}>↗ TAMM (AUH)</a>
            <a href="https://services.dha.gov.ae/sheryan/wps/portal/home/services-professional/online-verification" target="_blank" rel="noopener noreferrer" style={{padding:'5px 9px',background:'#1d4ed8',color:'white',borderRadius:5,textDecoration:'none',fontSize:10,fontWeight:600}}>↗ Sheryan (DXB)</a>
            <a href="https://mohap.gov.ae/en/services/attestation-of-medical-leaves-and-reports" target="_blank" rel="noopener noreferrer" style={{padding:'5px 9px',background:'#475569',color:'white',borderRadius:5,textDecoration:'none',fontSize:10,fontWeight:600}}>↗ MOHAP</a>
          </div>
          <div style={{fontSize:10,color:'#64748b'}}>Verify any sick leave certificate before approving to avoid fraudulent absences.</div>
        </div>
        <InboxPanel title="C3 card requests" items={inbox.pendingTasks || []} tone="warning" linkHref="/workers" renderItem={t => <><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{t.worker_name}</div><div style={{fontSize:10,color:'var(--hint)'}}>{t.worker_number}</div></div><StatusBadge label="C3 pending" tone="warning" /></>} />
        <InboxPanel title="Timesheet discrepancies" items={inbox.pendingDiscrepancies || []} tone="danger" linkHref="/timesheet-reconcile" renderItem={d => <><span className="label">{d.iws_worker_name} · {Math.abs(d.difference)}h diff</span><StatusBadge label="pending" tone="danger" /></>} />
      </div>
    </AppShell>

    {/* Action drawer — rendered outside AppShell for z-index */}
    {drawerOpen && drawerRecord && drawerWorker && (
      <div style={{position:'fixed',inset:0,zIndex:99}} onClick={closeDrawer}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)'}} />
        <div style={{position:'fixed',right:0,top:0,width:460,height:'100vh',background:'#fff',borderLeft:'0.5px solid var(--border)',boxShadow:'-4px 0 24px rgba(0,0,0,0.12)',zIndex:100,display:'flex',flexDirection:'column',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{padding:'20px 24px',borderBottom:'0.5px solid var(--border)',flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:18,fontWeight:700}}>{drawerType === 'document' ? titleCase(drawerRecord.document_type) : drawerRecord.certification_type}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{drawerWorker.full_name} · {drawerWorker.worker_number}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeDrawer}>✕</button>
            </div>
            <div style={{marginTop:10}}>
              <StatusBadge label={drawerRecord.status || 'missing'} tone={getStatusTone(drawerRecord.status || 'missing')} />
            </div>
          </div>

          {/* Body */}
          <div style={{flex:1,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>

            {/* Current info */}
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>Current Info</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {drawerType === 'document' && <>
                  <div><div style={{fontSize:11,color:'var(--hint)'}}>Issue date</div><div style={{fontSize:13,fontWeight:500}}>{drawerRecord.issue_date ? formatDate(drawerRecord.issue_date) : 'Not on file'}</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)'}}>Expiry date</div><div style={{fontSize:13,fontWeight:500,color:drawerRecord.status==='expired'?'var(--danger)':drawerRecord.status==='expiring_soon'?'var(--warning)':'var(--text)'}}>{drawerRecord.expiry_date ? formatDate(drawerRecord.expiry_date) : 'Not set'}</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)'}}>Category</div><div style={{fontSize:13}}><StatusBadge label={CATEGORY_MAP[drawerRecord.document_type] || 'personal'} tone="neutral" /></div></div>
                  {drawerRecord.notes && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--hint)'}}>Notes</div><div style={{fontSize:12}}>{drawerRecord.notes}</div></div>}
                </>}
                {drawerType === 'certification' && <>
                  <div><div style={{fontSize:11,color:'var(--hint)'}}>Issuer</div><div style={{fontSize:13,fontWeight:500}}>{drawerRecord.issuer || '\u2014'}</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)'}}>Issue date</div><div style={{fontSize:13,fontWeight:500}}>{drawerRecord.issue_date ? formatDate(drawerRecord.issue_date) : '\u2014'}</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)'}}>Expiry date</div><div style={{fontSize:13,fontWeight:500,color:drawerRecord.status==='expired'?'var(--danger)':drawerRecord.status==='expiring_soon'?'var(--warning)':'var(--text)'}}>{drawerRecord.expiry_date ? formatDate(drawerRecord.expiry_date) : '\u2014'}</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)'}}>{days !== null && days < 0 ? 'Days overdue' : 'Days remaining'}</div><div style={{fontSize:13,fontWeight:500,color:days!==null&&days<0?'var(--danger)':days!==null&&days<=30?'var(--warning)':'var(--text)'}}>{days !== null ? (days < 0 ? Math.abs(days) + ' days overdue' : days + ' days') : '\u2014'}</div></div>
                </>}
              </div>
            </div>

            {/* Alert banners */}
            {days !== null && days < 0 && <div style={{padding:'8px 12px',background:'var(--danger-bg, #fef2f2)',border:'1px solid var(--danger-border, #fecaca)',borderRadius:6,fontSize:12,color:'var(--danger)'}}>⚠ Expired {Math.abs(days)} days ago — upload renewal immediately</div>}
            {days !== null && days > 0 && days <= 30 && <div style={{padding:'8px 12px',background:'var(--warning-bg, #fffbeb)',border:'1px solid var(--warning-border, #fde68a)',borderRadius:6,fontSize:12,color:'var(--warning)'}}>⏰ Expiring in {days} days — schedule renewal</div>}

            {/* Contract-specific info */}
            {isContract && <div style={{padding:'10px 14px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,fontSize:12,color:'#1e40af'}}>Unlimited Contract — renewal updates visa dates only. No new offer letter required.</div>}

            {/* Form */}
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>
                {drawerType === 'certification' ? 'Renew Certificate' : drawerRecord.status === 'missing' ? 'Upload Document' : isContract ? 'Renew Contract' : 'Upload Renewal'}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>

                {drawerType === 'certification' && (
                  <div className="form-field"><label className="form-label">Issuer</label><input className="form-input" value={renewIssuer} onChange={e => setRenewIssuer(e.target.value)} /></div>
                )}

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">{isContract ? 'New contract start date' : 'New issue date'}</label>
                    <input className="form-input" type="date" value={drawerForm.issue_date} onChange={e => {
                      const val = e.target.value
                      setDrawerForm(f => ({...f, issue_date: val, ...(isContract ? {expiry_date: twoYearsFromStr(val)} : {})}))
                    }} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">{isContract ? 'New contract end date *' : 'New expiry date *'}</label>
                    <input className="form-input" type="date" value={drawerForm.expiry_date} onChange={e => setDrawerForm(f => ({...f, expiry_date: e.target.value}))} style={!drawerForm.expiry_date ? {borderColor:'var(--danger)'} : {}} />
                    {EXPIRY_HINTS[drawerRecord.document_type] && <div style={{fontSize:10,color:'var(--hint)',marginTop:3}}>{EXPIRY_HINTS[drawerRecord.document_type]}</div>}
                  </div>
                </div>

                {drawerType === 'document' && (
                  <div className="form-field"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={drawerForm.notes} onChange={e => setDrawerForm(f => ({...f, notes: e.target.value}))} style={{resize:'vertical'}} /></div>
                )}

                <div className="form-field">
                  <label className="form-label">Upload file</label>
                  <input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { const f = e.target.files[0]; if (f) setDrawerForm(prev => ({...prev, file: f})) }} />
                  {drawerForm.file && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {drawerForm.file.name}</div>}
                </div>

                <button
                  className="btn btn-teal"
                  style={{width:'100%'}}
                  disabled={!drawerForm.expiry_date}
                  onClick={drawerType === 'document' ? handleSaveDocument : handleSaveCertification}
                >
                  {drawerType === 'certification' ? 'Save Renewal' : 'Save & Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Insurance & WC Expiry Alerts */}
    {insuranceAlerts.length > 0 && (() => {
      const redAlerts = insuranceAlerts.filter(a => a.severity === 'red')
      const amberAlerts = insuranceAlerts.filter(a => a.severity === 'amber')
      return (
      <div className="panel" style={{marginTop:16,border: redAlerts.length > 0 ? '2px solid #fca5a5' : '1px solid #fde68a'}}>
        <div className="panel-header">
          <div>
            <h2 style={{color: redAlerts.length > 0 ? '#dc2626' : '#0d9488'}}>Insurance &amp; WC Expiry Alerts</h2>
            <p>{redAlerts.length} expired · {amberAlerts.length} expiring within 30 days</p>
          </div>
          <StatusBadge label={`${insuranceAlerts.length} alerts`} tone={redAlerts.length > 0 ? 'danger' : 'warning'} />
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
          {insuranceAlerts.map((a, i) => {
            const isRed = a.severity === 'red'
            const daysLeft = Math.ceil((new Date(a.expiry_date) - new Date()) / (1000*60*60*24))
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:6,background: isRed ? '#fef2f2' : '#fffbeb',border: isRed ? '1px solid #fecaca' : '1px solid #fde68a'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color: isRed ? '#dc2626' : '#92400e'}}>
                    {a.full_name} <span style={{fontSize:11,fontWeight:400,color:'#64748b'}}>· {a.worker_number}</span>
                  </div>
                  <div style={{fontSize:12,color: isRed ? '#991b1b' : '#78350f',marginTop:2}}>
                    <strong>{a.doc_type}</strong> {isRed ? 'EXPIRED' : `expires in ${daysLeft} days`} — {formatDate(a.expiry_date)}
                  </div>
                </div>
                {a.pack_blocked && <span style={{fontSize:10,fontWeight:700,background:'#dc2626',color:'#fff',padding:'3px 8px',borderRadius:10}}>PACK BLOCKED</span>}
                <Link href={`/workers/${a.worker_id}`} className="btn btn-teal btn-sm">Update Document</Link>
              </div>
            )
          })}
        </div>
      </div>
    )})()}

    {/* Leave Non-Return Alerts */}
    {(() => { const nrAlerts = checkNonReturnStatus(); return nrAlerts.length > 0 ? (
      <div className="panel" style={{marginTop:16,border:'2px solid #fca5a5',background:'#fef2f2'}}>
        <div className="panel-header"><div><h2 style={{color:'#dc2626'}}>Leave Non-Return Alerts</h2><p>{nrAlerts.length} worker{nrAlerts.length!==1?'s':''} overdue</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Worker</th><th>Expected Return</th><th>Days Overdue</th><th>Action</th></tr></thead>
          <tbody>{nrAlerts.map(a => (
            <tr key={a.leave_id}>
              <td style={{fontWeight:500}}>{a.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{a.worker_number}</div></td>
              <td style={{fontSize:12}}>{a.expected_return}</td>
              <td style={{fontWeight:700,color:'#dc2626'}}>{a.days_overdue} days</td>
              <td><Link href="/leave" style={{fontSize:12,color:'var(--teal)'}}>Review →</Link></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    ) : null })()}
    </>
  )
}

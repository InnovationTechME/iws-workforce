'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '../../../components/AppShell'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'
import LetterViewer from '../../../components/LetterViewer'
import { getCertificationsByWorker, getWarningsByWorker, getLeaveByWorker, getLettersByWorker, getNextWarningType, generateRefNumber, addLetter, getWarnings, getWorkerWarningLevel, makeId, getOffboardingByWorker, OFFBOARDING_ITEMS, calculateLeaveBalance, getILOEStatus, updateDocument, generateDocFileName } from '../../../lib/mockStore'
import { getWorkerById } from '../../../lib/workerService'
import { getDocumentsByWorker, upsertDocument } from '../../../lib/documentService'
import { getDocumentTemplate, generateDocumentFilename } from '../../../lib/documentRegister'
import { getAttendanceByWorker } from '../../../lib/attendanceService'
import { formatCurrency, formatDate, getStatusTone } from '../../../lib/utils'
import { offerLetterHTML, warningLetterHTML, experienceLetterHTML, terminationWithNoticeHTML, terminationWithoutNoticeHTML, resignationAcceptanceHTML, policyManualHTML, TERMINATION_GROUNDS_LIST } from '../../../lib/letterTemplates'

export default function WorkerDetailPage() {
  const { id } = useParams()
  const [worker, setWorker] = useState(null)
  const [docs, setDocs] = useState([])
  const [certs, setCerts] = useState([])
  const [warnings, setWarnings] = useState([])
  const [letters, setLetters] = useState([])
  const [attendance, setAttendance] = useState([])
  const [tab, setTab] = useState('profile')
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')
  const [letterLang, setLetterLang] = useState('english')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [docForm, setDocForm] = useState({ issue_date:'', expiry_date:'', file_name:null, file_original:null, notes:'' })
  const [showTerminationForm, setShowTerminationForm] = useState(false)
  const [terminationType, setTerminationType] = useState('notice')
  const [terminationDetails, setTerminationDetails] = useState({ notice_days:30, last_working_date:'', reason:'', reason_body:'', ground_key:'misconduct', additional_details:'', effective_date:new Date().toISOString().split('T')[0], resignation_date:'', notice_period:'60 days', additional_note:'' })

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const w = await getWorkerById(id)
        if (cancelled) return
        setWorker(w)
        if (w) {
          try { setDocs(await getDocumentsByWorker(id)) } catch (e) { console.error(e); setDocs([]) }
          try { setAttendance(await getAttendanceByWorker(id)) } catch (e) { setAttendance([]) }
          setCerts(getCertificationsByWorker(id))
          setWarnings(getWarningsByWorker(id))
          setLetters(getLettersByWorker(id))
        }
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load worker')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (!worker) return <AppShell pageTitle="Worker"><div className="page-shell"><div className="panel"><div className="empty-state"><h3>Worker not found</h3></div></div></div></AppShell>

  const expiredDocs = docs.filter(d => d.status === 'expired' || d.status === 'missing').length
  const missingBlocking = docs.filter(d => d.is_blocking && (d.status === 'missing' || d.status === 'expired')).length
  const expiredCerts = certs.filter(c => c.status === 'expired').length
  const warningLevel = getWorkerWarningLevel(id)
  const activeWarnings = warnings.filter(w => w.status === 'open').length

  const tenureText = (() => {
    if (!worker.joining_date) return '—'
    const start = new Date(worker.joining_date)
    const now = new Date()
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    if (now.getDate() < start.getDate()) months--
    if (months < 0) months = 0
    const years = Math.floor(months / 12)
    const rem = months % 12
    if (years === 0) return `${months} mo${months===1?'':'s'}`
    return `${years} yr${years===1?'':'s'} ${rem} mo${rem===1?'':'s'}`
  })()

  const attendancePct = (() => {
    if (!worker.joining_date) return 100
    const start = new Date(worker.joining_date)
    const today = new Date()
    let workingDays = 0
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay()
      if (dow !== 0) workingDays++
    }
    if (workingDays === 0) return 100
    const absent = attendance.filter(a => ['absent_unauthorised','absent_sick','absent_approved','absent'].includes(a.status)).length
    return Math.max(0, Math.min(100, Math.round(((workingDays - absent) / workingDays) * 1000) / 10))
  })()
  const attendanceColor = attendancePct >= 95 ? 'var(--success)' : attendancePct >= 85 ? 'var(--warning)' : 'var(--danger)'
  const warningColor = activeWarnings === 0 ? 'var(--success)' : activeWarnings <= 2 ? 'var(--warning)' : 'var(--danger)'
  const docColor = missingBlocking === 0 ? 'var(--success)' : missingBlocking <= 2 ? 'var(--warning)' : 'var(--danger)'
  const warningBadges = { first: [{label:'1st Warning', cls:'badge-1st'}], second: [{label:'1st Warning',cls:'badge-1st'},{label:'2nd Warning',cls:'badge-2nd'}], final: [{label:'1st Warning',cls:'badge-1st'},{label:'2nd Warning',cls:'badge-2nd'},{label:'Final Warning',cls:'badge-final'}], none: [] }

  return (
    <>
    <AppShell pageTitle={worker.full_name}>
      {worker.active === false && (
        <div style={{background:'#f1f5f9',border:'1.5px solid #cbd5e1',borderRadius:8,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:20}}>⚠</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#334155'}}>Inactive Worker — File closed {worker.end_date ? formatDate(worker.end_date) : ''}</div>
              <div style={{fontSize:12,color:'#64748b',marginTop:2}}>This worker is not on active payroll. Reactivation requires Operations and Owner approval.</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm">Request Reactivation</button>
        </div>
      )}

      <PageHeader eyebrow="Worker detail" title={worker.full_name}
        description={`${worker.worker_number} · ${worker.category} · ${worker.trade_role}`}
        actions={<div style={{display:'flex',gap:8}}><Link href="/workers" className="btn btn-secondary">← Workers</Link></div>}
        meta={<StatusBadge label={worker.status} tone={getStatusTone(worker.status)} />} />

      {(() => { const obr = getOffboardingByWorker(id); return obr && obr.status === 'in_progress' ? (
        <div style={{background:'#fff7ed',border:'2px solid #f97316',borderRadius:8,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>🚪</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#9a3412'}}>Offboarding in progress</div>
            <div style={{fontSize:12,color:'#9a3412'}}>Last working date: {formatDate(obr.last_working_date)} · Reason: {obr.reason}</div>
            <div style={{fontSize:11,color:'#c2410c',marginTop:2}}>{OFFBOARDING_ITEMS.filter(i=>i.required&&!obr.checklist[i.key]?.done).length} required exit items outstanding</div>
          </div>
        </div>
      ) : null })()}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{tenureText}</div><div className="lbl">Time with Company</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20,color:attendanceColor}}>{attendancePct}%</div><div className="lbl">Attendance Rate</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20,color:warningColor}}>{activeWarnings}</div><div className="lbl">Active Warnings</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20,color:docColor}}>{missingBlocking === 0 ? '0 issues' : `${missingBlocking} missing`}</div><div className="lbl">Doc Status</div></div>
      </div>

      <div className="panel">
        {warningLevel !== 'none' && (
          <div style={{display:'flex',gap:6,marginBottom:12}}>
            {warningBadges[warningLevel]?.map(b => (
              <span key={b.label} style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600, background: b.cls==='badge-1st'?'#fef9c3': b.cls==='badge-2nd'?'#fed7aa':'#fee2e2', color: b.cls==='badge-1st'?'#854d0e': b.cls==='badge-2nd'?'#9a3412':'#991b1b'}}>{b.label}</span>
            ))}
          </div>
        )}

        <div className="tabs">
          {['profile','documents','certifications','warnings','letters'].map(t => <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        {tab === 'profile' && (
          <div>
            <div className="form-grid">
              {[['Full name',worker.full_name],['Worker number',worker.worker_number],['Category',worker.category],['Trade / role',worker.trade_role],['Nationality',worker.nationality],['Passport',worker.passport_number],['Date of birth',worker.date_of_birth||'—'],['Passport expiry',formatDate(worker.passport_expiry)],['Emirates ID',worker.emirates_id||'—'],['EID expiry',formatDate(worker.emirates_id_expiry)],['Mobile',worker.mobile_number],['WhatsApp',worker.whatsapp_number||'—'],['Email',worker.email],['Visa company',worker.visa_company],['Visa number',worker.visa_number||'—'],['Project site',worker.project_site],['Joining date',formatDate(worker.joining_date)],['Onboarding status',worker.onboarding_status]].map(([label,value]) => (
                <div key={label}>
                  <div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:500}}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {worker.category === 'Subcontract Worker' && <div className="form-grid" style={{marginTop:12}}>
              <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Subcontractor company</div><div style={{fontSize:13,fontWeight:500}}>{worker.subcontractor_company || '—'}</div></div>
              <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Billing rate</div><div style={{fontSize:13,fontWeight:500}}>{worker.subcontractor_billing_rate ? formatCurrency(worker.subcontractor_billing_rate) + '/hr' : '—'}</div></div>
              <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Cost rate</div><div style={{fontSize:13,fontWeight:500}}>{worker.subcontractor_cost_rate ? formatCurrency(worker.subcontractor_cost_rate) + '/hr' : '—'}</div></div>
            </div>}
            <div style={{marginTop:16,background:'var(--surface)',borderRadius:8,padding:'14px 16px',border:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>Compensation</div>
              {worker.payroll_type === 'monthly' ? (
                <div className="form-grid">
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Basic salary</div><div style={{fontSize:13,fontWeight:600}}>{formatCurrency(worker.monthly_salary)}/mo</div></div>
                  {worker.housing_allowance > 0 && <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Housing allowance</div><div style={{fontSize:13,fontWeight:500}}>{formatCurrency(worker.housing_allowance)}/mo</div></div>}
                  {worker.transport_allowance > 0 && <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Transport allowance</div><div style={{fontSize:13,fontWeight:500}}>{formatCurrency(worker.transport_allowance)}/mo</div></div>}
                  {worker.food_allowance > 0 && <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Food allowance</div><div style={{fontSize:13,fontWeight:500}}>{formatCurrency(worker.food_allowance)}/mo</div></div>}
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Total package</div><div style={{fontSize:13,fontWeight:700,color:'var(--teal)'}}>{formatCurrency(worker.monthly_salary + (worker.housing_allowance||0) + (worker.transport_allowance||0) + (worker.food_allowance||0) + (worker.other_allowance||0))}/mo</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>OT rate (weekday 125%)</div><div style={{fontSize:13,fontWeight:500}}>AED {(worker.monthly_salary / 26 / 8 * 1.25).toFixed(2)}/hr</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>OT rate (Friday 150%)</div><div style={{fontSize:13,fontWeight:500}}>AED {(worker.monthly_salary / 26 / 8 * 1.5).toFixed(2)}/hr</div></div>
                </div>
              ) : (
                <div className="form-grid">
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Hourly rate</div><div style={{fontSize:13,fontWeight:600}}>{formatCurrency(worker.hourly_rate)}/hr</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>OT rate (125%)</div><div style={{fontSize:13,fontWeight:500}}>AED {(worker.hourly_rate * 1.25).toFixed(2)}/hr</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>OT rate (150%)</div><div style={{fontSize:13,fontWeight:500}}>AED {(worker.hourly_rate * 1.5).toFixed(2)}/hr</div></div>
                  <div><div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>Est. monthly (208 hrs)</div><div style={{fontSize:13,fontWeight:500}}>{formatCurrency(worker.hourly_rate * 208)}</div></div>
                </div>
              )}
            </div>
            {/* Leave Balance */}
            {(() => { const lb = calculateLeaveBalance(worker.id); if (!lb) return null; return (
              <div style={{marginTop:16,background:'var(--surface)',borderRadius:8,padding:'14px 16px',border:'0.5px solid var(--border)'}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>Leave Balance</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                  <div style={{background:'var(--teal-bg)',borderRadius:6,padding:'10px 12px',border:'1px solid var(--teal-border)'}}><div style={{fontSize:11,color:'var(--muted)'}}>Accrued</div><div style={{fontSize:22,fontWeight:700,color:'var(--teal)'}}>{lb.accrued}</div><div style={{fontSize:10,color:'var(--hint)'}}>days earned</div></div>
                  <div style={{background:'var(--danger-bg)',borderRadius:6,padding:'10px 12px',border:'1px solid var(--danger-border)'}}><div style={{fontSize:11,color:'var(--muted)'}}>Used</div><div style={{fontSize:22,fontWeight:700,color:'var(--danger)'}}>{lb.used}</div><div style={{fontSize:10,color:'var(--hint)'}}>days taken</div></div>
                  <div style={{background:'var(--success-bg)',borderRadius:6,padding:'10px 12px',border:'1px solid var(--success-border)'}}><div style={{fontSize:11,color:'var(--muted)'}}>Remaining</div><div style={{fontSize:22,fontWeight:700,color:'var(--success)'}}>{lb.remaining}</div><div style={{fontSize:10,color:'var(--hint)'}}>days available</div></div>
                  <div style={{background:'var(--surface)',borderRadius:6,padding:'10px 12px',border:'1px solid var(--border)'}}><div style={{fontSize:11,color:'var(--muted)'}}>Accrual Rate</div><div style={{fontSize:18,fontWeight:700}}>{lb.accrual_rate}</div><div style={{fontSize:10,color:'var(--hint)'}}>days/month · {lb.months_of_service}mo service</div></div>
                </div>
                <div style={{marginTop:8,fontSize:11,color:'var(--hint)'}}>UAE Labour Law: 30 calendar days annual leave per year after 1 year service. Accrues at 2.5 days/month.</div>
              </div>
            )})()}
            {/* ILOE Insurance */}
            {(() => { const iloe = getILOEStatus(worker.id); if (!iloe) return null; return (
              <div style={{marginTop:16,background:'var(--surface)',borderRadius:8,padding:'14px 16px',border:'0.5px solid var(--border)'}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>Workers Compensation Insurance (ILOE)</div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <StatusBadge label={iloe.label} tone={iloe.tone} />
                  {iloe.status === 'active' && <span style={{fontSize:12,color:'var(--muted)'}}>Expires: {formatDate(iloe.expiry)}</span>}
                </div>
                {iloe.status !== 'not_required' && (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                    <div><div style={{fontSize:11,color:'var(--hint)'}}>Provider</div><div style={{fontSize:13,fontWeight:500}}>{iloe.provider||'—'}</div></div>
                    <div><div style={{fontSize:11,color:'var(--hint)'}}>Annual cost</div><div style={{fontSize:13,fontWeight:500}}>AED {iloe.annual_cost||0}</div></div>
                    <div><div style={{fontSize:11,color:'var(--hint)'}}>Monthly deduction</div><div style={{fontSize:13,fontWeight:600,color:'var(--danger)'}}>AED {iloe.monthly_deduction||0}</div></div>
                  </div>
                )}
                {iloe.status === 'not_required' && <div style={{fontSize:12,color:'var(--hint)'}}>Subcontract workers — ILOE managed by their company.</div>}
              </div>
            )})()}
          </div>
        )}

        {tab === 'documents' && (
          <div>
            {(() => {
              const today = new Date(); today.setHours(0,0,0,0)
              const PACK_TYPES = ['passport_copy','passport_photo','uae_visa','emirates_id','workmen_compensation']
              const COMPLIANCE_ONLY = ['health_insurance','health_card']
              const statusFor = (d) => {
                if (!d.file_url) return { tone:'neutral', label:'Missing', bg:'#f1f5f9', border:'#e2e8f0' }
                if (d.expiry_date) {
                  const exp = new Date(d.expiry_date)
                  const days = Math.ceil((exp - today) / (1000*60*60*24))
                  if (days < 0) return { tone:'danger', label:'Expired', bg:'#fef2f2', border:'#fecaca' }
                  if (days <= 30) return { tone:'warning', label:'Expiring', bg:'#fffbeb', border:'#fde68a' }
                }
                return { tone:'success', label:'Valid', bg:'#ecfdf5', border:'#6ee7b7' }
              }
              const packDocs = docs.filter(d => PACK_TYPES.includes(d.doc_type))
              return (
                <div style={{marginBottom:20,padding:'14px 16px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>Pack Documents — Required for Document Pack Generation</div>
                      <div style={{fontSize:11,color:'var(--hint)'}}>Only WC expiry blocks pack generation. Health insurance is tracked for compliance only.</div>
                    </div>
                    <Link href="/packs" style={{fontSize:12,color:'#0d9488',fontWeight:500}}>Build Pack →</Link>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>
                    {packDocs.length === 0 ? (
                      <div style={{gridColumn:'1/-1',fontSize:12,color:'var(--hint)',padding:12,textAlign:'center'}}>No pack document slots yet — run document register init</div>
                    ) : packDocs.map(d => {
                      const s = statusFor(d)
                      const has = !!d.file_url
                      const isWC = d.doc_type === 'workmen_compensation'
                      const wcOk = d.highlighted_name_confirmed === true
                      const packBlocked = isWC && d.expiry_date && new Date(d.expiry_date) < today
                      return (
                        <div key={d.id} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:8,padding:'10px 12px'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>{d.label}</div>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                            <StatusBadge label={s.label} tone={s.tone} />
                            <span style={{fontSize:9,fontWeight:600,background:'#0d9488',color:'#fff',padding:'2px 6px',borderRadius:10}}>IN PACK</span>
                          </div>
                          {d.expiry_date && <div style={{fontSize:11,color:'var(--muted)'}}>Expires {formatDate(d.expiry_date)}</div>}
                          {isWC && has && (
                            <div style={{fontSize:10,marginTop:3,color:wcOk?'#16a34a':'#dc2626'}}>
                              {wcOk ? '✓ Name highlighted' : '⚠ Not confirmed'}
                            </div>
                          )}
                          {packBlocked && <div style={{fontSize:10,fontWeight:600,marginTop:4,color:'#991b1b',background:'#fee2e2',padding:'3px 6px',borderRadius:4}}>PACK BLOCKED</div>}
                          <button className="btn btn-teal btn-sm" style={{fontSize:10,padding:'3px 8px',marginTop:6}} onClick={() => { setSelectedDoc(d); setDocForm({ issue_date:new Date().toISOString().split('T')[0], expiry_date:d.expiry_date||'', file_name:null, file_original:null, notes:'' }) }}>{has ? 'Update' : 'Upload'}</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>All documents on file</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Document</th><th>Status</th><th>Expiry</th><th>File</th><th>Action</th></tr></thead>
                <tbody>
                  {docs.length === 0 ? <tr><td colSpan={5} style={{textAlign:'center',color:'var(--hint)',padding:32}}>No documents recorded</td></tr> : docs.map(d => {
                    const today = new Date(); today.setHours(0,0,0,0)
                    const has = !!d.file_url
                    let statusLabel = 'Missing', statusTone = 'neutral'
                    if (has) {
                      if (d.expiry_date) {
                        const days = Math.ceil((new Date(d.expiry_date) - today) / (1000*60*60*24))
                        if (days < 0) { statusLabel='Expired'; statusTone='danger' }
                        else if (days <= 30) { statusLabel='Expiring Soon'; statusTone='warning' }
                        else { statusLabel='Valid'; statusTone='success' }
                      } else { statusLabel='Valid'; statusTone='success' }
                    }
                    const compliance = ['health_insurance','health_card'].includes(d.doc_type)
                    const fileName = d.file_url ? d.file_url.split('/').pop() : generateDocumentFilename(worker, d.doc_type, 'pdf')
                    return (
                      <tr key={d.id}>
                        <td>
                          <div style={{fontWeight:500}}>{d.label}</div>
                          {compliance && <div style={{fontSize:10,color:'var(--hint)',fontStyle:'italic',marginTop:2}}>Compliance tracking only — not included in document pack</div>}
                        </td>
                        <td><StatusBadge label={statusLabel} tone={statusTone} /></td>
                        <td style={{fontSize:12,color:statusTone==='danger'?'var(--danger)':statusTone==='warning'?'var(--warning)':'var(--muted)'}}>{d.expiry_date ? formatDate(d.expiry_date) : '—'}</td>
                        <td style={{fontSize:11,color:has?'var(--text)':'var(--hint)'}}>
                          {has ? <a href={d.file_url} target="_blank" rel="noreferrer" style={{color:'#0d9488'}}>📎 {fileName}</a> : <span style={{fontStyle:'italic'}}>Not uploaded</span>}
                        </td>
                        <td>
                          <button className="btn btn-teal btn-sm" style={{fontSize:11}} onClick={() => { setSelectedDoc(d); setDocForm({ issue_date:new Date().toISOString().split('T')[0], expiry_date:d.expiry_date||'', file_name:null, file_original:null, notes:'' }) }}>{has ? 'Update' : 'Upload'}</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Document drawer */}
            {selectedDoc && (
              <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',justifyContent:'flex-end'}} onClick={() => setSelectedDoc(null)}>
                <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.2)',backdropFilter:'blur(2px)'}} />
                <div style={{position:'relative',width:420,height:'100vh',background:'#fff',borderLeft:'0.5px solid var(--border)',padding:24,overflowY:'auto',display:'flex',flexDirection:'column',gap:16,boxShadow:'-8px 0 32px rgba(15,23,42,.08)'}} onClick={e => e.stopPropagation()}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',paddingBottom:16,borderBottom:'0.5px solid var(--border)'}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600}}>{selectedDoc.label || selectedDoc.doc_type}</div>
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{worker.full_name} · {worker.worker_number}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDoc(null)}>✕</button>
                  </div>

                  {/* Section A — Current info */}
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>Current Document</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <div><div style={{fontSize:11,color:'var(--hint)'}}>Doc type</div><StatusBadge label={selectedDoc.doc_type} tone="neutral" /></div>
                      <div><div style={{fontSize:11,color:'var(--hint)'}}>Status</div><StatusBadge label={selectedDoc.status} tone={getStatusTone(selectedDoc.status)} /></div>
                      <div><div style={{fontSize:11,color:'var(--hint)'}}>Issue date</div><div style={{fontSize:13,fontWeight:500}}>{formatDate(selectedDoc.issue_date)}</div></div>
                      <div><div style={{fontSize:11,color:'var(--hint)'}}>Expiry date</div><div style={{fontSize:13,fontWeight:500}}>{formatDate(selectedDoc.expiry_date)}</div></div>
                    </div>
                    {selectedDoc.file_url ? (
                      <div style={{marginTop:10,padding:'8px 12px',background:'#ecfdf5',border:'1px solid #6ee7b7',borderRadius:6,fontSize:12}}>
                        <a href={selectedDoc.file_url} target="_blank" rel="noreferrer" style={{color:'#065f46'}}>📎 {selectedDoc.file_url.split('/').pop()}</a>
                      </div>
                    ) : (
                      <div style={{marginTop:10,padding:'8px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:6,fontSize:12,color:'#92400e'}}>No file uploaded yet</div>
                    )}
                  </div>

                  {/* Section B — Upload / update */}
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>Upload New Version</div>
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div className="form-field">
                        <label className="form-label">File</label>
                        <input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
                          const file = e.target.files[0]
                          if (!file) return
                          const autoName = generateDocumentFilename(worker, selectedDoc.doc_type, file.name)
                          setDocForm({...docForm, file_name:autoName, file_original:file.name})
                        }} />
                        {docForm.file_name && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {docForm.file_name}{docForm.file_original && docForm.file_original !== docForm.file_name ? <span style={{color:'var(--hint)',marginLeft:6}}>({docForm.file_original})</span> : ''}</div>}
                      </div>
                      <div className="form-grid">
                        <div className="form-field"><label className="form-label">New issue date</label><input className="form-input" type="date" value={docForm.issue_date} onChange={e => setDocForm({...docForm, issue_date:e.target.value})} /></div>
                        <div className="form-field"><label className="form-label">New expiry date *</label><input className="form-input" type="date" value={docForm.expiry_date} onChange={e => setDocForm({...docForm, expiry_date:e.target.value})} /></div>
                      </div>
                      <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={docForm.notes} onChange={e => setDocForm({...docForm, notes:e.target.value})} rows={2} /></div>
                      <button className="btn btn-primary" onClick={async () => {
                        const today = new Date()
                        let newStatus = 'valid'
                        if (docForm.expiry_date) {
                          const daysUntil = Math.ceil((new Date(docForm.expiry_date) - today) / (1000*60*60*24))
                          newStatus = daysUntil < 0 ? 'expired' : daysUntil <= 30 ? 'expiring_soon' : 'valid'
                        }
                        try {
                          await upsertDocument(id, selectedDoc.doc_type, { label:selectedDoc.label, is_blocking:selectedDoc.is_blocking, issue_date:docForm.issue_date || null, expiry_date:docForm.expiry_date || null, file_url:docForm.file_name || selectedDoc.file_url || null, status:newStatus })
                          setDocs(await getDocumentsByWorker(id))
                          setSelectedDoc(null)
                        } catch (err) { alert('Save failed: ' + err.message) }
                      }}>Save &amp; Update</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'certifications' && (<>
          <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:'#0f172a',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Medical Certificate Verification</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <a href="https://www.tamm.abudhabi/wb/doh/sick-leave-validation" target="_blank" rel="noopener noreferrer" style={{padding:'6px 10px',background:'#0d9488',color:'white',borderRadius:6,textDecoration:'none',fontSize:11,fontWeight:600}}>↗ TAMM (Abu Dhabi)</a>
              <a href="https://services.dha.gov.ae/sheryan/wps/portal/home/services-professional/online-verification" target="_blank" rel="noopener noreferrer" style={{padding:'6px 10px',background:'#1d4ed8',color:'white',borderRadius:6,textDecoration:'none',fontSize:11,fontWeight:600}}>↗ Sheryan (Dubai)</a>
              <a href="https://mohap.gov.ae/en/services/attestation-of-medical-leaves-and-reports" target="_blank" rel="noopener noreferrer" style={{padding:'6px 10px',background:'#475569',color:'white',borderRadius:6,textDecoration:'none',fontSize:11,fontWeight:600}}>↗ MOHAP (Other Emirates)</a>
            </div>
            <div style={{fontSize:10,color:'#64748b',marginTop:6}}>Use these links to verify the authenticity of any medical certificate before accepting it.</div>
          </div>
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
        </>)}

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

        {tab === 'letters' && (
          <div>
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              <select className="filter-select" value={letterLang} onChange={e => setLetterLang(e.target.value)}>
                <option value="english">English</option>
                <option value="hindi">English + Hindi</option>
              </select>
              <button className="btn btn-teal btn-sm" onClick={() => {
                const ref = generateRefNumber('offer_letter')
                const today = new Date().toISOString().split('T')[0]
                const offerData = { ...worker, trade_role: worker.trade_role, employment_type: worker.category, pay_type: worker.pay_type || 'monthly', base_salary_or_rate: worker.monthly_salary || worker.hourly_rate || 0, housing_allowance: worker.housing_allowance || 0, transport_allowance: worker.transport_allowance || 0, food_allowance: worker.food_allowance || 0, start_date: worker.joining_date || '', nationality: worker.nationality || '', passport_number: worker.passport_number || '' }
                const html = offerLetterHTML(worker, offerData, ref, today, letterLang)
                addLetter({ id: makeId('let'), ref_number: ref, letter_type:'offer_letter', worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, language: letterLang, issued_date: today, issued_by:'HR Admin', linked_record_id:null, status:'issued', notes:'' })
                setLetters(getLettersByWorker(worker.id))
                setViewerHtml(html); setViewerRef(ref)
              }}>+ Offer Letter</button>
              <button className="btn btn-secondary btn-sm" style={{borderColor:'var(--warning)',color:'var(--warning)'}} onClick={() => {
                const nextType = getNextWarningType(worker.id)
                const ref = generateRefNumber(nextType)
                const today = new Date().toISOString().split('T')[0]
                const allWarnings = getWarnings().filter(w => w.worker_id === worker.id)
                const latestWarning = allWarnings[allWarnings.length - 1] || { reason:'Disciplinary matter', issue_date: today, issued_by:'HR Admin', penalty_amount:'', penalty_type:'' }
                const html = warningLetterHTML(worker, latestWarning, ref, today, nextType, letterLang)
                addLetter({ id: makeId('let'), ref_number: ref, letter_type: nextType, worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, language: letterLang, issued_date: today, issued_by:'HR Admin', linked_record_id: latestWarning.id || null, status:'issued', notes:'' })
                setLetters(getLettersByWorker(worker.id))
                setViewerHtml(html); setViewerRef(ref)
              }}>+ Warning Letter (auto-level)</button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const ref = generateRefNumber('experience_letter')
                const today = new Date().toISOString().split('T')[0]
                const html = experienceLetterHTML(worker, ref, today, letterLang)
                addLetter({ id: makeId('let'), ref_number: ref, letter_type:'experience_letter', worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, language: letterLang, issued_date: today, issued_by:'HR Admin', linked_record_id:null, status:'issued', notes:'' })
                setLetters(getLettersByWorker(worker.id))
                setViewerHtml(html); setViewerRef(ref)
              }}>+ Experience Letter</button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const ref = generateRefNumber('policy_manual')
                const today = new Date().toISOString().split('T')[0]
                const html = policyManualHTML(worker, ref, today)
                addLetter({ id: makeId('let'), ref_number: ref, letter_type:'policy_manual', worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, language:'english', issued_date: today, issued_by:'HR Admin', linked_record_id:null, status:'issued', notes:'' })
                setLetters(getLettersByWorker(worker.id))
                setViewerHtml(html); setViewerRef(ref)
              }}>+ Policy Manual</button>
            </div>

            <div style={{marginTop:16,paddingTop:14,borderTop:'2px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#dc2626',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Exit & Termination Letters</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                <button style={{background:'#dc2626',color:'white',border:'none',borderRadius:6,padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer'}} onClick={() => { setTerminationType('notice'); setShowTerminationForm(true) }}>📋 Termination with Notice</button>
                <button style={{background:'#7f1d1d',color:'white',border:'none',borderRadius:6,padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer'}} onClick={() => { setTerminationType('no_notice'); setShowTerminationForm(true) }}>⚠ Termination without Notice</button>
                <button style={{background:'#16a34a',color:'white',border:'none',borderRadius:6,padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer'}} onClick={() => { setTerminationType('resignation'); setShowTerminationForm(true) }}>✉ Resignation Acceptance</button>
              </div>
              {showTerminationForm && (
                <div style={{background:terminationType==='resignation'?'#f0fdf4':'#fff1f2',border:'1px solid '+(terminationType==='resignation'?'#86efac':'#fca5a5'),borderRadius:8,padding:16,marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:terminationType==='resignation'?'#166534':'#991b1b'}}>{terminationType==='notice'?'Termination with Notice (30 days)':terminationType==='no_notice'?'Termination without Notice — UAE Art. 44':'Resignation Acceptance'}</div>
                    <button onClick={() => setShowTerminationForm(false)} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:16,color:'#94a3b8'}}>✕</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    {terminationType==='notice' && <><div className="form-field"><label className="form-label">Notice period (days) *</label><input className="form-input" type="number" value={terminationDetails.notice_days} onChange={e=>setTerminationDetails({...terminationDetails,notice_days:e.target.value})} /></div><div className="form-field"><label className="form-label">Last working date *</label><input className="form-input" type="date" value={terminationDetails.last_working_date} onChange={e=>setTerminationDetails({...terminationDetails,last_working_date:e.target.value})} /></div><div className="form-field"><label className="form-label">Reason</label><input className="form-input" value={terminationDetails.reason} onChange={e=>setTerminationDetails({...terminationDetails,reason:e.target.value})} /></div><div className="form-field span-2"><label className="form-label">Detailed reason</label><textarea className="form-textarea" rows={3} value={terminationDetails.reason_body} onChange={e=>setTerminationDetails({...terminationDetails,reason_body:e.target.value})} /></div></>}
                    {terminationType==='no_notice' && <><div className="form-field"><label className="form-label">Ground *</label><select className="form-select" value={terminationDetails.ground_key} onChange={e=>setTerminationDetails({...terminationDetails,ground_key:e.target.value})}>{Object.entries(TERMINATION_GROUNDS_LIST).map(([key,g])=>(<option key={key} value={key}>{g.label} — {g.article}</option>))}</select></div><div className="form-field"><label className="form-label">Effective date *</label><input className="form-input" type="date" value={terminationDetails.effective_date} onChange={e=>setTerminationDetails({...terminationDetails,effective_date:e.target.value})} /></div><div className="form-field span-2"><label className="form-label">Additional details</label><textarea className="form-textarea" rows={3} value={terminationDetails.additional_details} onChange={e=>setTerminationDetails({...terminationDetails,additional_details:e.target.value})} /></div></>}
                    {terminationType==='resignation' && <><div className="form-field"><label className="form-label">Resignation date *</label><input className="form-input" type="date" value={terminationDetails.resignation_date} onChange={e=>setTerminationDetails({...terminationDetails,resignation_date:e.target.value})} /></div><div className="form-field"><label className="form-label">Last working date *</label><input className="form-input" type="date" value={terminationDetails.last_working_date} onChange={e=>setTerminationDetails({...terminationDetails,last_working_date:e.target.value})} /></div><div className="form-field"><label className="form-label">Notice period</label><input className="form-input" value={terminationDetails.notice_period} onChange={e=>setTerminationDetails({...terminationDetails,notice_period:e.target.value})} /></div><div className="form-field span-2"><label className="form-label">Additional note</label><textarea className="form-textarea" rows={2} value={terminationDetails.additional_note} onChange={e=>setTerminationDetails({...terminationDetails,additional_note:e.target.value})} /></div></>}
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                    <button className="btn btn-secondary" onClick={() => setShowTerminationForm(false)}>Cancel</button>
                    <button style={{background:terminationType==='resignation'?'#16a34a':'#dc2626',color:'white',border:'none',borderRadius:6,padding:'8px 18px',fontSize:13,fontWeight:600,cursor:'pointer'}} onClick={() => {
                      try {
                        const typeMap = {notice:'termination_notice',no_notice:'termination_no_notice',resignation:'resignation_acceptance'}
                        const letterType = typeMap[terminationType]
                        const ref = generateRefNumber(letterType)
                        const today = new Date().toISOString().split('T')[0]
                        let html = ''
                        if (terminationType==='notice') html = terminationWithNoticeHTML(worker,terminationDetails,ref,today,letterLang)
                        else if (terminationType==='no_notice') html = terminationWithoutNoticeHTML(worker,terminationDetails,ref,today,letterLang)
                        else html = resignationAcceptanceHTML(worker,terminationDetails,ref,today,letterLang)
                        addLetter({id:makeId('let'),ref_number:ref,letter_type:letterType,worker_id:worker.id,worker_name:worker.full_name,worker_number:worker.worker_number,language:letterLang,issued_date:today,issued_by:'HR Admin',linked_record_id:null,status:'issued',notes:terminationType==='no_notice'?TERMINATION_GROUNDS_LIST[terminationDetails.ground_key]?.label:''})
                        setLetters(getLettersByWorker(worker.id))
                        setViewerHtml(html); setViewerRef(ref); setShowTerminationForm(false)
                      } catch(e) { alert('Error: ' + e.message) }
                    }}>Generate & Preview Letter</button>
                  </div>
                  {terminationType==='no_notice' && <div style={{marginTop:10,padding:'8px 12px',background:'#fff',border:'1px solid #fca5a5',borderRadius:4,fontSize:11,color:'#991b1b'}}><strong>Legal note:</strong> {TERMINATION_GROUNDS_LIST[terminationDetails.ground_key]?.article} — {TERMINATION_GROUNDS_LIST[terminationDetails.ground_key]?.label}. {TERMINATION_GROUNDS_LIST[terminationDetails.ground_key]?.consequence}.</div>}
                </div>
              )}
            </div>

            {letters.length === 0 ? (
              <div className="empty-state"><h3>No letters issued yet</h3><p>Use the buttons above to generate letters for this worker.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Ref number</th><th>Type</th><th>Date</th><th>Language</th><th>Issued by</th><th>Actions</th></tr></thead>
                  <tbody>
                    {letters.map(l => {
                      const typeLabels = { offer_letter:'Offer Letter', warning_1st:'1st Warning', warning_2nd:'2nd Warning', warning_final:'Final Warning', experience_letter:'Experience Letter', memo:'Memo', termination_notice:'Termination (notice)', termination_no_notice:'Termination (no notice)', resignation_acceptance:'Resignation acceptance', policy_manual:'Policy Manual' }
                      const toneBg = { warning_1st:'#fef9c3', warning_2nd:'#fed7aa', warning_final:'#fee2e2', offer_letter:'#f0fdf4', experience_letter:'#eff6ff', memo:'#f8fafc', termination_notice:'#fff1f2', termination_no_notice:'#fef2f2', resignation_acceptance:'#f0fdf4', policy_manual:'#f0fdfa' }
                      const toneColor = { warning_1st:'#854d0e', warning_2nd:'#9a3412', warning_final:'#991b1b', offer_letter:'#166534', experience_letter:'#1e40af', memo:'#475569', policy_manual:'#134e4a' }
                      return (
                        <tr key={l.id}>
                          <td style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--teal)'}}>{l.ref_number}</td>
                          <td><span style={{padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600,background:toneBg[l.letter_type]||'#f8fafc',color:toneColor[l.letter_type]||'#475569'}}>{typeLabels[l.letter_type]||l.letter_type}</span></td>
                          <td style={{fontSize:12,color:'var(--muted)'}}>{l.issued_date}</td>
                          <td style={{fontSize:12,color:'var(--muted)'}}>{l.language}</td>
                          <td style={{fontSize:12,color:'var(--muted)'}}>{l.issued_by}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              let html = ''
                              if (l.letter_type === 'offer_letter') html = offerLetterHTML(worker, worker, l.ref_number, l.issued_date, l.language)
                              else if (['warning_1st','warning_2nd','warning_final'].includes(l.letter_type)) {
                                const w = getWarnings().find(w => w.id === l.linked_record_id) || { reason:'On record', issue_date: l.issued_date, issued_by: l.issued_by, penalty_amount:'', penalty_type:'' }
                                html = warningLetterHTML(worker, w, l.ref_number, l.issued_date, l.letter_type, l.language)
                              }
                              else if (l.letter_type === 'experience_letter') html = experienceLetterHTML(worker, l.ref_number, l.issued_date, l.language)
                              else if (l.letter_type === 'termination_notice') html = terminationWithNoticeHTML(worker, {notice_days:30,last_working_date:'—',reason:l.notes||'—',reason_body:''}, l.ref_number, l.issued_date, l.language)
                              else if (l.letter_type === 'termination_no_notice') { const gk = Object.keys(TERMINATION_GROUNDS_LIST).find(k=>TERMINATION_GROUNDS_LIST[k].label===l.notes)||'misconduct'; html = terminationWithoutNoticeHTML(worker, {ground_key:gk,additional_details:'',effective_date:l.issued_date}, l.ref_number, l.issued_date, l.language) }
                              else if (l.letter_type === 'resignation_acceptance') html = resignationAcceptanceHTML(worker, {resignation_date:'—',last_working_date:'—',notice_period:'60 days'}, l.ref_number, l.issued_date, l.language)
                              else if (l.letter_type === 'policy_manual') html = policyManualHTML(worker, l.ref_number, l.issued_date)
                              setViewerHtml(html); setViewerRef(l.ref_number)
                            }}>View</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </AppShell>
    {viewerHtml && <LetterViewer html={viewerHtml} refNumber={viewerRef} onClose={() => { setViewerHtml(null); setViewerRef('') }} />}
    </>
  )
}

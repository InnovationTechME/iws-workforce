'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '../../../components/AppShell'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'
import LetterViewer from '../../../components/LetterViewer'
import { getWorker, getDocumentsByWorker, getCertificationsByWorker, getWarningsByWorker, getLeaveByWorker, getLettersByWorker, getNextWarningType, generateRefNumber, addLetter, getWarnings, getWorkerWarningLevel, makeId, getOffboardingByWorker, OFFBOARDING_ITEMS, calculateLeaveBalance } from '../../../lib/mockStore'
import { formatCurrency, formatDate, getStatusTone } from '../../../lib/utils'
import { offerLetterHTML, warningLetterHTML, experienceLetterHTML, terminationWithNoticeHTML, terminationWithoutNoticeHTML, resignationAcceptanceHTML, TERMINATION_GROUNDS_LIST } from '../../../lib/letterTemplates'

export default function WorkerDetailPage() {
  const { id } = useParams()
  const [worker, setWorker] = useState(null)
  const [docs, setDocs] = useState([])
  const [certs, setCerts] = useState([])
  const [warnings, setWarnings] = useState([])
  const [letters, setLetters] = useState([])
  const [tab, setTab] = useState('profile')
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')
  const [letterLang, setLetterLang] = useState('english')
  const [showTerminationForm, setShowTerminationForm] = useState(false)
  const [terminationType, setTerminationType] = useState('notice')
  const [terminationDetails, setTerminationDetails] = useState({ notice_days:30, last_working_date:'', reason:'', reason_body:'', ground_key:'misconduct', additional_details:'', effective_date:new Date().toISOString().split('T')[0], resignation_date:'', notice_period:'60 days', additional_note:'' })

  useEffect(() => {
    const w = getWorker(id)
    setWorker(w)
    if (w) {
      setDocs(getDocumentsByWorker(id))
      setCerts(getCertificationsByWorker(id))
      setWarnings(getWarningsByWorker(id))
      setLetters(getLettersByWorker(id))
    }
  }, [id])

  if (!worker) return <AppShell pageTitle="Worker"><div className="page-shell"><div className="panel"><div className="empty-state"><h3>Worker not found</h3></div></div></div></AppShell>

  const expiredDocs = docs.filter(d => d.status === 'expired' || d.status === 'missing').length
  const expiredCerts = certs.filter(c => c.status === 'expired').length
  const warningLevel = getWorkerWarningLevel(id)
  const warningBadges = { first: [{label:'1st Warning', cls:'badge-1st'}], second: [{label:'1st Warning',cls:'badge-1st'},{label:'2nd Warning',cls:'badge-2nd'}], final: [{label:'1st Warning',cls:'badge-1st'},{label:'2nd Warning',cls:'badge-2nd'},{label:'Final Warning',cls:'badge-final'}], none: [] }

  return (
    <>
    <AppShell pageTitle={worker.full_name}>
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
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{worker.payroll_type === 'monthly' ? formatCurrency(worker.monthly_salary) : formatCurrency(worker.hourly_rate) + '/hr'}</div><div className="lbl">Compensation</div></div>
        <div className="stat-card"><div className={`num ${expiredDocs > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{expiredDocs}</div><div className="lbl">Doc issues</div></div>
        <div className="stat-card"><div className={`num ${expiredCerts > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{expiredCerts}</div><div className="lbl">Cert issues</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{warnings.filter(w=>w.status==='open').length}</div><div className="lbl">Open warnings</div></div>
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
              {[['Full name',worker.full_name],['Worker number',worker.worker_number],['Category',worker.category],['Trade / role',worker.trade_role],['Nationality',worker.nationality],['Passport',worker.passport_number],['Date of birth',worker.date_of_birth||'—'],['Passport expiry',formatDate(worker.passport_expiry)],['Emirates ID',worker.emirates_id||'—'],['EID expiry',formatDate(worker.emirates_id_expiry)],['Mobile',worker.mobile_number],['Email',worker.email],['Visa company',worker.visa_company],['Visa number',worker.visa_number||'—'],['Project site',worker.project_site],['Joining date',formatDate(worker.joining_date)],['Onboarding status',worker.onboarding_status]].map(([label,value]) => (
                <div key={label}>
                  <div style={{fontSize:11,color:'var(--hint)',marginBottom:3}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:500}}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {worker.category === 'Subcontractor' && <div className="form-grid" style={{marginTop:12}}>
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
                      const typeLabels = { offer_letter:'Offer Letter', warning_1st:'1st Warning', warning_2nd:'2nd Warning', warning_final:'Final Warning', experience_letter:'Experience Letter', memo:'Memo', termination_notice:'Termination (notice)', termination_no_notice:'Termination (no notice)', resignation_acceptance:'Resignation acceptance' }
                      const toneBg = { warning_1st:'#fef9c3', warning_2nd:'#fed7aa', warning_final:'#fee2e2', offer_letter:'#f0fdf4', experience_letter:'#eff6ff', memo:'#f8fafc', termination_notice:'#fff1f2', termination_no_notice:'#fef2f2', resignation_acceptance:'#f0fdf4' }
                      const toneColor = { warning_1st:'#854d0e', warning_2nd:'#9a3412', warning_final:'#991b1b', offer_letter:'#166534', experience_letter:'#1e40af', memo:'#475569' }
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

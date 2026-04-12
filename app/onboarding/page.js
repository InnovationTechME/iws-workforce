'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import LetterViewer from '../../components/LetterViewer'
import { getOnboardingRecords, updateOnboardingRecord, getWorker, addToBlacklist, updateWorker, getVisibleWorkers, makeId, getDocumentsByWorker, addDocument, updateDocument, generateRefNumber, addLetter } from '../../lib/mockStore'
import { policyManualHTML } from '../../lib/letterTemplates'
import { formatDate, getStatusTone } from '../../lib/utils'

const STAGES = [
  { key:'offer', label:'Offer Accepted', icon:'📋' },
  { key:'documents', label:'Documentation', icon:'📄' },
  { key:'mohre', label:'MOHRE & Visa', icon:'🏛️' },
  { key:'arrival', label:'Arrival & Active', icon:'✅' },
]

// Track 1 — IT Field Staff (direct_staff, not Office Staff)
const CHECKLIST_IT_FIELD = [
  { key:'passport', label:'Passport Copy', required:true },
  { key:'photo', label:'Passport Photo', required:true },
  { key:'uae_visa', label:'UAE Visa (Innovation Tech sponsored)', required:true },
  { key:'emirates_id', label:'Emirates ID', required:true },
  { key:'medical_fitness', label:'Medical Fitness Certificate', required:true },
  { key:'signed_offer_letter', label:'Signed Offer Letter', required:true },
  { key:'labour_card', label:'IT Labour Card', required:true },
  { key:'medical_insurance', label:'Health Insurance', required:true, tracksExpiry:true, note:'IT-provided. Upload certificate with worker name visible.' },
  { key:'workers_compensation', label:"Workmen's Compensation (WC)", required:true, tracksExpiry:true, requiresHighlight:true, note:'Upload the WC schedule page showing this worker\u2019s name highlighted.' },
]
const CHECKLIST_IT_FIELD_OPTIONAL = [
  { key:'iloe_certificate', label:'ILOE Certificate (when available)', required:false, note:'Non-blocking — upload when issued.' },
]

// Track 2 — Contract Workers
const CHECKLIST_CONTRACT = [
  { key:'passport', label:'Passport Copy', required:true },
  { key:'photo', label:'Passport Photo', required:true },
  { key:'uae_visa', label:"UAE Visa (worker's own visa)", required:true },
  { key:'emirates_id', label:'Emirates ID or National ID', required:true },
  { key:'medical_insurance', label:"Health Insurance (worker's own)", required:true, tracksExpiry:true, note:'Worker provides own health insurance. Upload their certificate.' },
  { key:'workers_compensation', label:"Workmen's Compensation (WC)", required:true, tracksExpiry:true, requiresHighlight:true, note:'IT provides WC cover. Upload WC schedule page with this worker\u2019s name highlighted.' },
]

// Track 3 — Supplier Workers
const CHECKLIST_SUPPLIER = [
  { key:'passport', label:'Passport Copy', required:true },
  { key:'photo', label:'Passport Photo', required:true },
  { key:'uae_visa', label:'UAE Visa (employer-sponsored)', required:true },
  { key:'emirates_id', label:'Emirates ID or National ID', required:true },
  { key:'medical_insurance', label:'Health Insurance (employer-provided)', required:true, tracksExpiry:true, note:'Supplier\u2019s employer provides health insurance. Obtain and upload certificate.' },
  { key:'workers_compensation', label:"Workmen's Compensation (WC)", required:true, tracksExpiry:true, requiresHighlight:true, note:'Supplier provides WC. Upload their WC schedule page with worker name highlighted.' },
]

function getChecklistForWorker(worker) {
  if (!worker) return { primary: CHECKLIST_IT_FIELD, optional: CHECKLIST_IT_FIELD_OPTIONAL, trackLabel: 'IT Field Staff' }
  const track = worker.entry_track
  const cat = worker.category
  if (track === 'contract_worker' || cat === 'Contract Worker') return { primary: CHECKLIST_CONTRACT, optional: [], trackLabel: 'Contract Worker' }
  if (track === 'subcontractor_company_worker' || cat === 'Subcontract Worker') return { primary: CHECKLIST_SUPPLIER, optional: [], trackLabel: 'Supplier Worker' }
  return { primary: CHECKLIST_IT_FIELD, optional: CHECKLIST_IT_FIELD_OPTIONAL, trackLabel: cat === 'Office Staff' ? 'IT Office Staff' : 'IT Field Staff' }
}

function getStageIndex(status) {
  if (!status) return 0
  const s = status.toLowerCase()
  if (s.includes('converted') || s.includes('active')) return 4
  if (s.includes('arrival') || s.includes('ready')) return 3
  if (s.includes('documentation') || s.includes('pending doc')) return 1
  if (s.includes('medical')) return 1
  return 0
}

function getRequiredUploaded(docs, checklist) {
  const required = (checklist || []).filter(c => c.required)
  return required.filter(c => docs.some(d => d.document_type === c.key && (d.status === 'valid' || d.status === 'expiring_soon')))
}

function getProgress(record, docs, worker) {
  const { primary } = getChecklistForWorker(worker)
  const required = primary.filter(c => c.required)
  const uploaded = getRequiredUploaded(docs, primary).length
  const docShare = required.length ? (uploaded / required.length) * 50 : 0
  let pct = 25 + docShare
  if (record.onboarding_status?.includes('Converted') || record.documentation_complete) pct += 12.5
  if (record.arrival_date) pct += 12.5
  return Math.min(100, Math.round(pct))
}

export default function OnboardingPage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [workerDocs, setWorkerDocs] = useState([])
  const [showMedicalDrawer, setShowMedicalDrawer] = useState(false)
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState(false)
  const [medForm, setMedForm] = useState({ medical_date:'', medical_result:'passed', medical_notes:'' })
  const [medErrors, setMedErrors] = useState([])
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [uploadForm, setUploadForm] = useState({ issue_date:'', expiry_date:'', file:null, highlight_confirmed:false })
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')

  useEffect(() => { setRecords(getOnboardingRecords()); setWorkers(getVisibleWorkers()) }, [])

  const selectRecord = (rec) => {
    setSelected(rec)
    const w = getWorker(rec.worker_id)
    setSelectedWorker(w)
    if (w) setWorkerDocs(getDocumentsByWorker(rec.worker_id))
  }

  const handleMedical = () => {
    if (!medForm.medical_date) { setMedErrors(['Medical date is required']); return }
    setMedErrors([])
    updateOnboardingRecord(selected.id, { ...medForm, onboarding_status: medForm.medical_result === 'passed' ? 'Documentation' : 'Medical Failed' })
    if (medForm.medical_result === 'failed') { setShowMedicalDrawer(false); setShowBlacklistConfirm(true) }
    else { setRecords(getOnboardingRecords()); setSelected({...selected, ...medForm, onboarding_status:'Documentation'}); setShowMedicalDrawer(false) }
  }

  const handleBlacklist = () => {
    if (selectedWorker) {
      addToBlacklist({ full_name:selectedWorker.full_name, passport_number:selectedWorker.passport_number, nationality:selectedWorker.nationality, reason:'Failed pre-employment medical. '+medForm.medical_notes, blacklisted_by:'HR Admin' })
      updateWorker(selectedWorker.id, { status:'Closed', active:false, onboarding_status:'Closed - Medical Failed' })
    }
    setShowBlacklistConfirm(false); setRecords(getOnboardingRecords())
  }

  const handleDocUpload = (docKey, docMeta) => {
    if (!selected || !selectedWorker) return
    const existing = workerDocs.find(d => d.document_type === docKey)
    const ext = uploadForm.file ? uploadForm.file.name.split('.').pop() : 'pdf'
    const fileName = uploadForm.file ? `${selectedWorker.worker_number}_${selectedWorker.full_name.replace(/\s+/g,'_')}_${docKey}.${ext}` : null
    const today = new Date().toISOString().split('T')[0]
    const expDate = uploadForm.expiry_date || null
    const status = expDate ? (() => { const d = Math.ceil((new Date(expDate) - new Date()) / (1000*60*60*24)); return d < 0 ? 'expired' : d <= 30 ? 'expiring_soon' : 'valid' })() : 'valid'
    const payload = {
      issue_date: uploadForm.issue_date || today,
      expiry_date: expDate,
      status,
      file_name: fileName || (existing?.file_name || null),
      notes: 'Uploaded during onboarding',
      is_blocking: !!docMeta?.required,
    }
    if (docMeta?.requiresHighlight) {
      payload.doc_subtype = 'highlighted_page'
      payload.highlighted_name_confirmed = !!uploadForm.highlight_confirmed
    }
    if (existing) { updateDocument(existing.id, payload) }
    else {
      const cat = ['passport','emirates_id','photo','cv'].includes(docKey) ? 'personal'
        : ['signed_offer_letter','offer_letter','labour_card','uae_visa','bank_account_details','employment_contract'].includes(docKey) ? 'employment'
        : ['site_induction'].includes(docKey) ? 'site'
        : 'compliance'
      addDocument({ worker_id: selectedWorker.id, document_type: docKey, document_category: cat, ...payload })
    }
    // Mirror expiry dates onto the worker record
    if (docKey === 'medical_insurance' && expDate) {
      updateWorker(selectedWorker.id, { health_insurance_expiry: expDate })
    }
    if (docKey === 'workers_compensation' && expDate) {
      updateWorker(selectedWorker.id, { workmen_comp_expiry: expDate, wc_highlighted_name_confirmed: !!uploadForm.highlight_confirmed })
    }
    setWorkerDocs(getDocumentsByWorker(selectedWorker.id))
    setExpandedDoc(null)
    setUploadForm({ issue_date:'', expiry_date:'', file:null, highlight_confirmed:false })
  }

  const handleConvert = () => {
    if (selectedWorker) {
      updateWorker(selectedWorker.id, { status:'Active', active:true, onboarding_status:'Active', joining_date:'2026-04-10' })
      updateOnboardingRecord(selected.id, { documentation_complete:true, conversion_date:'2026-04-10', onboarding_status:'Converted to Employee' })
      setRecords(getOnboardingRecords()); setSelected({...selected, documentation_complete:true, onboarding_status:'Converted to Employee'})
    }
  }

  const inDocs = records.filter(r => r.onboarding_status === 'Documentation' || r.onboarding_status === 'Pending Documents').length
  const converted = records.filter(r => r.onboarding_status?.includes('Converted')).length
  const failed = records.filter(r => r.onboarding_status?.includes('Failed')).length

  return (<>
    <AppShell pageTitle="Onboarding">
      <PageHeader eyebrow="Onboarding" title="Active onboarding" description="Track candidates through documentation, visa processing, and conversion to active workers." />

      <div className="summary-strip">
        <div className="stat-card"><div className="num info" style={{fontSize:20}}>{records.length}</div><div className="lbl">In onboarding</div></div>
        <div className="stat-card"><div className="num warning" style={{fontSize:20}}>{inDocs}</div><div className="lbl">Documentation stage</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:20}}>{converted}</div><div className="lbl">Converted</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:20}}>{failed}</div><div className="lbl">Failed / closed</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns: selected ? '1fr 1fr' : '1fr',gap:16}}>
        {/* Records List */}
        <div className="panel">
          <div className="panel-header"><div><h2>Onboarding records</h2></div></div>
          {records.length === 0 ? <div className="empty-state"><h3>No onboarding records</h3><p>Records appear when a signed offer is moved to onboarding.</p></div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {records.map(r => {
                const w = workers.find(wk => wk.id === r.worker_id)
                const docs = w ? getDocumentsByWorker(r.worker_id) : []
                const progress = getProgress(r, docs, w)
                const stageIdx = getStageIndex(r.onboarding_status)
                return (
                  <div key={r.id} style={{border:'1px solid var(--border)',borderRadius:8,padding:'14px 16px',cursor:'pointer',background:selected?.id===r.id?'#eff6ff':'#fff',transition:'all .15s'}} onClick={() => selectRecord(r)}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:14}}>{w?.full_name || r.worker_id}</div>
                        <div style={{fontSize:11,color:'var(--hint)'}}>{w?.trade_role} · {w?.worker_number}</div>
                      </div>
                      <StatusBadge label={r.onboarding_status} tone={r.onboarding_status?.includes('Failed')?'danger':r.onboarding_status?.includes('Converted')?'success':'info'} />
                    </div>
                    {/* Progress bar */}
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,height:6,background:'var(--border)',borderRadius:3}}>
                        <div style={{width:progress+'%',height:'100%',background:progress===100?'var(--success)':'var(--teal)',borderRadius:3,transition:'width .3s'}} />
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:progress===100?'var(--success)':'var(--muted)',minWidth:32}}>{progress}%</span>
                    </div>
                    {/* Mini stages */}
                    <div style={{display:'flex',gap:4,marginTop:8}}>
                      {STAGES.map((stage, si) => (
                        <div key={stage.key} style={{flex:1,height:3,borderRadius:2,background:si < stageIdx ? 'var(--success)' : si === stageIdx ? 'var(--teal)' : 'var(--border)'}} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && selectedWorker && (
          <div className="panel">
            <div className="panel-header">
              <div><h2>{selectedWorker.full_name}</h2><p>{selectedWorker.trade_role} · {selectedWorker.category}</p></div>
              <button className="btn btn-ghost btn-sm" onClick={() => {setSelected(null);setSelectedWorker(null)}}>✕</button>
            </div>

            {/* Progress bar */}
            {(() => { const progress = getProgress(selected, workerDocs, selectedWorker); return (
              <div style={{background:'var(--teal-bg)',border:'1px solid var(--teal-border)',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:600}}>Overall Progress</span>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--teal)'}}>{progress}%</span>
                </div>
                <div style={{height:8,background:'var(--border)',borderRadius:4}}>
                  <div style={{width:progress+'%',height:'100%',background:'var(--teal)',borderRadius:4,transition:'width .3s'}} />
                </div>
              </div>
            )})()}

            {/* Stage workflow */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:20}}>
              {STAGES.map((stage, si) => {
                const stageIdx = getStageIndex(selected.onboarding_status)
                const isDone = si < stageIdx
                const isActive = si === stageIdx
                return (
                  <div key={stage.key} style={{textAlign:'center',padding:'12px 8px',borderRadius:8,border:'2px solid '+(isDone?'var(--success)':isActive?'var(--teal)':'var(--border)'),background:isDone?'var(--success-bg)':isActive?'var(--teal-bg)':'#fff'}}>
                    <div style={{fontSize:20,marginBottom:4}}>{isDone ? '✅' : isActive ? stage.icon : '⏳'}</div>
                    <div style={{fontSize:11,fontWeight:600,color:isDone?'var(--success)':isActive?'var(--teal)':'var(--hint)'}}>{stage.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Document checklist — track-specific */}
            {(() => {
              const { primary, optional, trackLabel } = getChecklistForWorker(selectedWorker)
              const renderItem = (doc, isOptional) => {
                const existing = workerDocs.find(d => d.document_type === doc.key)
                const uploaded = !!existing && (existing.status === 'valid' || existing.status === 'expiring_soon')
                const isExpanded = expandedDoc === doc.key
                const expiryOnFile = existing?.expiry_date
                const highlightConfirmed = existing?.highlighted_name_confirmed === true
                const wcNeedsHighlight = doc.requiresHighlight && uploaded && !highlightConfirmed
                return (
                  <div key={doc.key}>
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                      <div style={{width:22,height:22,borderRadius:'50%',background:uploaded && !wcNeedsHighlight ? '#16a34a' : doc.required ? '#fecaca' : '#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {uploaded && !wcNeedsHighlight ? <span style={{color:'white',fontSize:12,fontWeight:700}}>✓</span> : doc.required ? <span style={{color:'#dc2626',fontSize:10,fontWeight:700}}>!</span> : null}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:doc.required&&!uploaded?600:400,color:uploaded?'var(--muted)':'var(--text)'}}>{doc.label}</div>
                        {doc.note && <div style={{fontSize:10,color:'var(--hint)',marginTop:2}}>{doc.note}</div>}
                        {uploaded && expiryOnFile && <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>Expires {formatDate(expiryOnFile)}</div>}
                        {wcNeedsHighlight && <div style={{fontSize:10,color:'#dc2626',marginTop:2}}>⚠ Name highlight not confirmed</div>}
                      </div>
                      {doc.required && !uploaded && <span style={{fontSize:9,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'2px 6px',borderRadius:10}}>BLOCKING</span>}
                      {isOptional && <span style={{fontSize:9,fontWeight:700,color:'#92400e',background:'#fef3c7',padding:'2px 6px',borderRadius:10}}>OPTIONAL</span>}
                      {uploaded ? (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontSize:10,color:'var(--success)',fontWeight:500}}>✓ On file</span>
                          <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 6px'}} onClick={() => { setExpandedDoc(isExpanded?null:doc.key); setUploadForm({issue_date:new Date().toISOString().split('T')[0],expiry_date:existing?.expiry_date||'',file:null,highlight_confirmed:highlightConfirmed}) }}>Replace</button>
                        </div>
                      ) : (
                        <button className="btn btn-teal btn-sm" style={{fontSize:11,padding:'3px 10px'}} onClick={() => { setExpandedDoc(isExpanded?null:doc.key); setUploadForm({issue_date:new Date().toISOString().split('T')[0],expiry_date:'',file:null,highlight_confirmed:false}) }}>📎 Upload</button>
                      )}
                    </div>
                    {isExpanded && (
                      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:'12px 14px',margin:'4px 0 8px 32px'}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                          <div className="form-field"><label className="form-label" style={{fontSize:10}}>Issue date</label><input className="form-input" type="date" style={{fontSize:12,padding:'4px 8px'}} value={uploadForm.issue_date} onChange={e => setUploadForm({...uploadForm,issue_date:e.target.value})} /></div>
                          <div className="form-field"><label className="form-label" style={{fontSize:10}}>Expiry date {doc.tracksExpiry ? '*' : ''}</label><input className="form-input" type="date" style={{fontSize:12,padding:'4px 8px'}} value={uploadForm.expiry_date} onChange={e => setUploadForm({...uploadForm,expiry_date:e.target.value})} /></div>
                        </div>
                        {doc.requiresHighlight && (
                          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,marginBottom:8,cursor:'pointer',padding:'6px 8px',background:'#fff',borderRadius:4,border:'1px solid #e2e8f0'}}>
                            <input type="checkbox" checked={uploadForm.highlight_confirmed} onChange={e => setUploadForm({...uploadForm, highlight_confirmed: e.target.checked})} style={{accentColor:'#0d9488'}} />
                            <span style={{fontWeight:500}}>Worker name highlighted on document ✓</span>
                          </label>
                        )}
                        <div className="form-field" style={{marginBottom:8}}>
                          <input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" style={{fontSize:11,padding:'4px 6px'}} onChange={e => { const f=e.target.files[0]; if(f) setUploadForm({...uploadForm,file:f}) }} />
                          {uploadForm.file && <div style={{fontSize:10,color:'var(--teal)',marginTop:3}}>📎 {uploadForm.file.name}</div>}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-teal btn-sm" style={{fontSize:11}} onClick={() => handleDocUpload(doc.key, doc)} disabled={doc.tracksExpiry && !uploadForm.expiry_date}>Save</button>
                          <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={() => setExpandedDoc(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <>
                  <div style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Document Checklist · {trackLabel}</div>
                      <div style={{fontSize:10,color:'var(--hint)'}}>
                        <span style={{color:'#dc2626',fontWeight:600}}>●</span> Blocking ({primary.filter(p=>p.required).length})
                      </div>
                    </div>
                    {primary.map(d => renderItem(d, false))}
                  </div>
                  {optional.length > 0 && (
                    <div style={{marginBottom:16,background:'#fffbeb',border:'1px solid #fde68a',borderRadius:6,padding:'10px 12px'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#92400e',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Optional — non-blocking</div>
                      {optional.map(d => renderItem(d, true))}
                    </div>
                  )}
                </>
              )
            })()}

            {/* Medical & Actions */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div className="metric-row"><span className="label">Arrival date</span><span className="value" style={{fontSize:12}}>{formatDate(selected.arrival_date)}</span></div>
              <div className="metric-row"><span className="label">Medical date</span><span className="value" style={{fontSize:12}}>{formatDate(selected.medical_date)}</span></div>
              <div className="metric-row"><span className="label">Medical result</span><span className="value"><StatusBadge label={selected.medical_result} tone={selected.medical_result==='passed'?'success':selected.medical_result==='failed'?'danger':'neutral'} /></span></div>

              {selected.medical_result === 'pending' && (
                <button className="btn btn-primary" onClick={() => setShowMedicalDrawer(true)}>Record Medical Result</button>
              )}
              {selected.onboarding_status === 'Documentation' && (() => {
                const { primary } = getChecklistForWorker(selectedWorker)
                const requiredDocs = primary.filter(c => c.required)
                const issues = []
                for (const c of requiredDocs) {
                  const d = workerDocs.find(x => x.document_type === c.key && (x.status === 'valid' || x.status === 'expiring_soon'))
                  if (!d) { issues.push({ label: c.label, reason: 'not uploaded' }); continue }
                  if (c.tracksExpiry && !d.expiry_date) issues.push({ label: c.label, reason: 'expiry date missing' })
                  if (c.requiresHighlight && d.highlighted_name_confirmed !== true) issues.push({ label: c.label, reason: 'name highlight not confirmed' })
                }
                const allRequiredDone = issues.length === 0
                return (<>
                  {!allRequiredDone && (
                    <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,padding:'10px 12px',fontSize:12}}>
                      <div style={{fontWeight:600,color:'#dc2626',marginBottom:4}}>Cannot convert to Active — outstanding items:</div>
                      {issues.map((c,i) => <div key={i} style={{color:'#dc2626',fontSize:11}}>• {c.label} — {c.reason}</div>)}
                    </div>
                  )}
                  {allRequiredDone && (
                    <div style={{background:'#ecfdf5',border:'1px solid #6ee7b7',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#065f46',fontWeight:500}}>✓ All required documents on file — ready to convert</div>
                  )}
                  <button className="btn btn-teal" disabled={!allRequiredDone} style={!allRequiredDone?{opacity:0.5,cursor:'not-allowed'}:{}} onClick={handleConvert}>✅ Complete Onboarding → Move to Active</button>
                </>)
              })()}
              <button className="btn btn-teal" onClick={() => {
                const worker = getWorker(selectedWorker.id) || selectedWorker
                const ref = generateRefNumber('policy_manual')
                const today = new Date().toISOString().split('T')[0]
                const html = policyManualHTML(worker, ref, today)
                addLetter({ id: makeId('let'), ref_number: ref, letter_type:'policy_manual', worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, language:'english', issued_date: today, issued_by:'HR Admin', linked_record_id: null, status:'issued', notes:'Issued at onboarding' })
                setViewerHtml(html); setViewerRef(ref)
              }}>📋 Generate Policy Manual</button>
              <Link href={'/workers/'+selected.worker_id} className="btn btn-secondary">Open worker profile →</Link>
            </div>
          </div>
        )}
      </div>

      {/* Medical drawer */}
      {showMedicalDrawer && (
        <div className="drawer-backdrop" onClick={() => setShowMedicalDrawer(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header"><div><div className="drawer-title">Record Medical Result</div></div><button className="btn btn-ghost btn-sm" onClick={() => setShowMedicalDrawer(false)}>✕</button></div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {medErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px'}}>{medErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
              <div className="form-field"><label className="form-label">Medical date *</label><input className="form-input" type="date" value={medForm.medical_date} onChange={e => setMedForm({...medForm,medical_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Result</label><select className="form-select" value={medForm.medical_result} onChange={e => setMedForm({...medForm,medical_result:e.target.value})}><option value="passed">Passed</option><option value="failed">Failed — close and blacklist</option></select></div>
              {medForm.medical_result === 'failed' && <div className="notice danger" style={{fontSize:12}}>This will close the record and add to blacklist.</div>}
              <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={medForm.medical_notes} onChange={e => setMedForm({...medForm,medical_notes:e.target.value})} rows={3} /></div>
            </div>
            <div style={{paddingTop:16,borderTop:'0.5px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-secondary" onClick={() => setShowMedicalDrawer(false)}>Cancel</button>
              <button className={`btn ${medForm.medical_result==='failed'?'btn-danger':'btn-primary'}`} onClick={handleMedical}>Save Result</button>
            </div>
          </div>
        </div>
      )}

      {showBlacklistConfirm && (
        <ConfirmDialog title="Close record and blacklist?" message={selectedWorker?.full_name+' failed medical. This closes the record and adds them to the blacklist.'} confirmLabel="Confirm" confirmTone="btn-danger" onConfirm={handleBlacklist} onCancel={() => setShowBlacklistConfirm(false)} />
      )}
    </AppShell>
    {viewerHtml && <LetterViewer html={viewerHtml} refNumber={viewerRef} onClose={() => { setViewerHtml(null); setViewerRef('') }} />}
  </>)
}

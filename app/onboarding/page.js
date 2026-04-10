'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getOnboardingRecords, updateOnboardingRecord, getWorker, addToBlacklist, updateWorker, getWorkers, makeId, getDocumentsByWorker } from '../../lib/mockStore'
import { formatDate, getStatusTone } from '../../lib/utils'

const STAGES = [
  { key:'offer', label:'Offer Accepted', icon:'📋' },
  { key:'documents', label:'Documentation', icon:'📄' },
  { key:'mohre', label:'MOHRE & Visa', icon:'🏛️' },
  { key:'arrival', label:'Arrival & Active', icon:'✅' },
]

const DOC_CHECKLIST = [
  { key:'passport', label:'Passport Copy', required:true },
  { key:'photo', label:'Passport Photo', required:true },
  { key:'cv', label:'CV / Resume', required:false },
  { key:'medical_fitness', label:'Medical Certificate', required:true },
  { key:'offer_letter', label:'Signed Offer Letter', required:true },
  { key:'emirates_id', label:'Emirates ID', required:false },
  { key:'visa', label:'Visa Copy', required:false },
  { key:'labour_card', label:'Labour Card', required:false },
]

function getStageIndex(status) {
  if (!status) return 0
  const s = status.toLowerCase()
  if (s.includes('converted') || s.includes('active')) return 4
  if (s.includes('arrival') || s.includes('ready')) return 3
  if (s.includes('documentation') || s.includes('pending doc')) return 1
  if (s.includes('medical')) return 1
  return 0
}

function getProgress(record, docs) {
  let score = 0, total = 8
  if (record.arrival_date) score++
  if (record.medical_result === 'passed') score++
  if (record.documentation_complete) score += 2
  if (record.onboarding_status?.includes('Converted')) score += 2
  // Count uploaded docs
  const uploadedDocs = docs.filter(d => DOC_CHECKLIST.some(c => c.key === d.document_type && (d.status === 'valid' || d.status === 'expiring_soon'))).length
  score += Math.min(uploadedDocs, 2)
  return Math.min(100, Math.round((score / total) * 100))
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

  useEffect(() => { setRecords(getOnboardingRecords()); setWorkers(getWorkers()) }, [])

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

  return (
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
                const progress = getProgress(r, docs)
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
            {(() => { const progress = getProgress(selected, workerDocs); return (
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

            {/* Document checklist */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Document Checklist</div>
              {DOC_CHECKLIST.map(doc => {
                const uploaded = workerDocs.some(d => d.document_type === doc.key && (d.status === 'valid' || d.status === 'expiring_soon'))
                return (
                  <div key={doc.key} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                    <div style={{width:22,height:22,borderRadius:4,background:uploaded?'var(--success)':'var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {uploaded && <span style={{color:'white',fontSize:12,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:uploaded?400:500,color:uploaded?'var(--muted)':'var(--text)',textDecoration:uploaded?'line-through':'none'}}>{doc.label}</div>
                    </div>
                    {doc.required && !uploaded && <span style={{fontSize:9,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'2px 6px',borderRadius:10}}>REQUIRED</span>}
                    {uploaded && <span style={{fontSize:10,color:'var(--success)'}}>✓ On file</span>}
                  </div>
                )
              })}
            </div>

            {/* Medical & Actions */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div className="metric-row"><span className="label">Arrival date</span><span className="value" style={{fontSize:12}}>{formatDate(selected.arrival_date)}</span></div>
              <div className="metric-row"><span className="label">Medical date</span><span className="value" style={{fontSize:12}}>{formatDate(selected.medical_date)}</span></div>
              <div className="metric-row"><span className="label">Medical result</span><span className="value"><StatusBadge label={selected.medical_result} tone={selected.medical_result==='passed'?'success':selected.medical_result==='failed'?'danger':'neutral'} /></span></div>

              {selected.medical_result === 'pending' && (
                <button className="btn btn-primary" onClick={() => setShowMedicalDrawer(true)}>Record Medical Result</button>
              )}
              {selected.onboarding_status === 'Documentation' && (
                <button className="btn btn-teal" onClick={handleConvert}>✅ Complete Onboarding → Move to Active</button>
              )}
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
  )
}

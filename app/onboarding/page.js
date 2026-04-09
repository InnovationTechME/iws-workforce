'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getOnboardingRecords, updateOnboardingRecord, getWorker, addToBlacklist, updateWorker, addWorker, getWorkers, makeId } from '../../lib/mockStore'
import { formatDate, getStatusTone } from '../../lib/utils'

export default function OnboardingPage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [showMedicalDrawer, setShowMedicalDrawer] = useState(false)
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState(false)
  const [medForm, setMedForm] = useState({ medical_date:'', medical_result:'passed', medical_notes:'' })
  const [medErrors, setMedErrors] = useState([])

  useEffect(() => {
    setRecords(getOnboardingRecords())
    setWorkers(getWorkers())
  }, [])

  const selectRecord = (rec) => {
    setSelected(rec)
    setSelectedWorker(getWorker(rec.worker_id))
  }

  const handleMedical = () => {
    if (!medForm.medical_date) { setMedErrors(['Medical date is required']); return }
    setMedErrors([])
    updateOnboardingRecord(selected.id, { ...medForm, onboarding_status: medForm.medical_result === 'passed' ? 'Documentation' : 'Medical Failed' })
    if (medForm.medical_result === 'failed') {
      setShowMedicalDrawer(false)
      setShowBlacklistConfirm(true)
    } else {
      setRecords(getOnboardingRecords())
      setSelected({...selected, ...medForm, onboarding_status:'Documentation'})
      setShowMedicalDrawer(false)
    }
  }

  const handleBlacklist = () => {
    if (selectedWorker) {
      addToBlacklist({ full_name: selectedWorker.full_name, passport_number: selectedWorker.passport_number, nationality: selectedWorker.nationality, reason: `Failed pre-employment medical. ${medForm.medical_notes}`, blacklisted_by:'HR Admin' })
      updateWorker(selectedWorker.id, { status:'Closed', active:false, onboarding_status:'Closed - Medical Failed' })
    }
    setShowBlacklistConfirm(false)
    setRecords(getOnboardingRecords())
  }

  const handleConvert = () => {
    if (selectedWorker) {
      updateWorker(selectedWorker.id, { status:'Active', active:true, onboarding_status:'Active', joining_date:'2026-04-08' })
      updateOnboardingRecord(selected.id, { documentation_complete:true, conversion_date:'2026-04-08', onboarding_status:'Converted to Employee' })
      setRecords(getOnboardingRecords())
      setSelected({...selected, documentation_complete:true, onboarding_status:'Converted to Employee'})
    }
  }

  const steps = ['Offer Accepted','Arrival Recorded','Medical Pending','Medical Passed','Documentation','Ready to Convert','Converted to Employee']

  return (
    <AppShell pageTitle="Onboarding">
      <PageHeader eyebrow="Onboarding" title="Active onboarding" description="Move candidates through arrival, medical, documentation, and conversion to employee." />

      <div className="summary-strip">
        <div className="stat-card"><div className="num info" style={{fontSize:20}}>{records.length}</div><div className="lbl">In onboarding</div></div>
        <div className="stat-card"><div className="num warning" style={{fontSize:20}}>{records.filter(r=>r.onboarding_status==='Documentation').length}</div><div className="lbl">Documentation stage</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:20}}>{records.filter(r=>r.onboarding_status==='Converted to Employee').length}</div><div className="lbl">Converted</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:20}}>{records.filter(r=>r.onboarding_status?.includes('Failed')).length}</div><div className="lbl">Failed / closed</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="panel">
          <div className="panel-header"><div><h2>Onboarding records</h2></div></div>
          {records.length === 0 ? <div className="empty-state"><h3>No onboarding records</h3><p>Records appear here when a signed offer is moved to onboarding.</p></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Worker</th><th>Stage</th><th>Medical</th><th>Docs</th></tr></thead>
                <tbody>
                  {records.map(r => {
                    const w = workers.find(wk => wk.id === r.worker_id)
                    return (
                      <tr key={r.id} style={{cursor:'pointer',background:selected?.id===r.id?'#f0fdfa':''}} onClick={() => selectRecord(r)}>
                        <td style={{fontWeight:500}}>{w?.full_name || r.worker_id}<div style={{fontSize:11,color:'var(--hint)'}}>{w?.trade_role}</div></td>
                        <td><StatusBadge label={r.onboarding_status} tone={r.onboarding_status?.includes('Failed')?'danger':r.onboarding_status==='Converted to Employee'?'success':'info'} /></td>
                        <td><StatusBadge label={r.medical_result} tone={r.medical_result==='passed'?'success':r.medical_result==='failed'?'danger':'neutral'} /></td>
                        <td><StatusBadge label={r.documentation_complete?'Complete':'Pending'} tone={r.documentation_complete?'success':'neutral'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && selectedWorker && (
          <div className="panel">
            <div className="panel-header"><div><h2>{selectedWorker.full_name}</h2><p>{selectedWorker.trade_role} · {selectedWorker.category}</p></div></div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:'var(--hint)',marginBottom:8}}>ONBOARDING PROGRESS</div>
              <div className="step-strip">
                {steps.map((step, i) => {
                  const stepIdx = steps.indexOf(selected.onboarding_status)
                  const isDone = i < stepIdx
                  const isActive = i === stepIdx
                  return (
                    <div key={step} style={{display:'flex',alignItems:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                        <div style={{width:20,height:20,borderRadius:'50%',background:isDone?'var(--success)':isActive?'var(--teal)':'var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:isDone||isActive?'white':'var(--hint)'}}>{isDone?'✓':i+1}</div>
                        <div style={{fontSize:9,color:isActive?'var(--teal)':'var(--hint)',textAlign:'center',width:52,lineHeight:1.2}}>{step}</div>
                      </div>
                      {i < steps.length-1 && <div style={{width:12,height:1,background:'var(--border)',margin:'0 2px',marginBottom:14}} />}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {[['Arrival date',formatDate(selected.arrival_date)],['Medical date',formatDate(selected.medical_date)],['Medical result',selected.medical_result],['Medical notes',selected.medical_notes||'—'],['Documentation',selected.documentation_complete?'Complete':'In progress']].map(([label,value]) => (
                <div key={label} className="metric-row"><span className="label">{label}</span><span className="value" style={{fontSize:12}}>{value}</span></div>
              ))}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {selected.medical_result === 'pending' && (
                <button className="btn btn-primary" onClick={() => setShowMedicalDrawer(true)}>Record Medical Result</button>
              )}
              {selected.onboarding_status === 'Documentation' && !selected.documentation_complete && (
                <div className="notice info" style={{fontSize:12}}>Upload required documents in the worker&apos;s Documents tab, then convert to employee.</div>
              )}
              {selected.onboarding_status === 'Documentation' && (
                <button className="btn btn-teal" onClick={handleConvert}>✓ Convert to Employee</button>
              )}
              <Link href={`/workers/${selected.worker_id}`} className="btn btn-secondary">Open worker profile →</Link>
            </div>
          </div>
        )}
      </div>

      {showMedicalDrawer && (
        <DrawerForm title="Record Medical Result" onClose={() => setShowMedicalDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowMedicalDrawer(false)}>Cancel</button><button className={`btn ${medForm.medical_result==='failed'?'btn-danger':'btn-primary'}`} onClick={handleMedical}>Save Result</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {medErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{medErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            <div className="form-field"><label className="form-label">Medical date *</label><input className="form-input" type="date" value={medForm.medical_date} onChange={e => setMedForm({...medForm,medical_date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Result</label><select className="form-select" value={medForm.medical_result} onChange={e => setMedForm({...medForm,medical_result:e.target.value})}><option value="passed">Passed — continue to documentation</option><option value="failed">Failed — close record and blacklist</option></select></div>
            {medForm.medical_result === 'failed' && <div className="notice danger" style={{fontSize:12}}>This will close the onboarding record and add the candidate to the blacklist.</div>}
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={medForm.medical_notes} onChange={e => setMedForm({...medForm,medical_notes:e.target.value})} rows={3} /></div>
          </div>
        </DrawerForm>
      )}

      {showBlacklistConfirm && (
        <ConfirmDialog title="Close record and add to blacklist?" message={`${selectedWorker?.full_name} failed the medical examination. This will close their onboarding record, set their status to Closed, and add them to the blacklist using passport number ${selectedWorker?.passport_number}.`} confirmLabel="Confirm — blacklist candidate" confirmTone="btn-danger" onConfirm={handleBlacklist} onCancel={() => setShowBlacklistConfirm(false)} />
      )}
    </AppShell>
  )
}

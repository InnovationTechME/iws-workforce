'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getAllCertificationsWithWorkers, addCertification, updateCertification } from '../../lib/certificationService'
import { getVisibleWorkers } from '../../lib/workerService'
import { formatDate, getStatusTone, validateRequired, validateDateNotPast, TODAY } from '../../lib/utils'

const CERT_TYPES = ['Working at Height','H2S Awareness','Confined Space Entry','First Aid','Welding Certificate','Rigger/Banksman','Scaffolder','Forklift Operator','IPAF/MEWP','Electrician Licence','BOSIET/HUET','Safety Officer','HSE Officer','Custom']

export default function CertificationsPage() {
  const [certs, setCerts] = useState([])
  const [workers, setWorkers] = useState([])
  const [queue, setQueue] = useState('expired')
  const [showDrawer, setShowDrawer] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const [formWarnings, setFormWarnings] = useState([])
  const [form, setForm] = useState({ worker_id:'', cert_type:'Working at Height', cert_number:'', issuer:'', issue_date:'', expiry_date:'', renewal_required:false, file_name:null })
  const [selectedCert, setSelectedCert] = useState(null)
  const [renewForm, setRenewForm] = useState({ issuer:'', issue_date:'', expiry_date:'', file_name:null })

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const today = new Date(); today.setHours(0,0,0,0)
  const computeStatus = (expiry) => {
    if (!expiry) return 'valid'
    const days = Math.ceil((new Date(expiry) - today) / (1000*60*60*24))
    if (days < 0) return 'expired'
    if (days <= 30) return 'expiring_soon'
    return 'valid'
  }

  const reloadCerts = async () => {
    const [ws, rows] = await Promise.all([getVisibleWorkers(), getAllCertificationsWithWorkers()])
    setWorkers(ws)
    const normalised = (rows || []).map(c => ({
      ...c,
      certification_type: c.cert_type,
      status: c.status || computeStatus(c.expiry_date),
    }))
    setCerts(normalised)
  }

  const workerDisplay = (wid) => {
    const w = certs.find(c => c.worker_id === wid)?.workers || workers.find(x => x.id === wid)
    return { name_primary: w?.full_name || 'Unknown', id_secondary: w?.worker_number || '—' }
  }
  const isInactive = (wid) => {
    const w = certs.find(c => c.worker_id === wid)?.workers || workers.find(x => x.id === wid)
    return w?.status === 'inactive'
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        if (!cancelled) await reloadCerts()
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load certifications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const queues = { expired: certs.filter(c => c.status === 'expired'), expiring_soon: certs.filter(c => c.status === 'expiring_soon'), renewal_required: certs.filter(c => c.renewal_required), valid: certs.filter(c => c.status === 'valid') }
  const current = queues[queue] || []

  const handleAdd = async () => {
    const errors = validateRequired([{value:form.worker_id,label:'Worker'},{value:form.cert_type,label:'Certification type'},{value:form.expiry_date,label:'Expiry date'}])
    if (errors.length > 0) { setFormErrors(errors); return }
    setFormErrors([])
    try {
      await addCertification({
        worker_id: form.worker_id,
        cert_type: form.cert_type,
        cert_number: form.cert_number || null,
        issuer: form.issuer || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        renewal_required: !!form.renewal_required,
        file_url: form.file_name || null,
        status: computeStatus(form.expiry_date)
      })
      await reloadCerts()
      setShowDrawer(false)
      setForm({ worker_id:'', cert_type:'Working at Height', cert_number:'', issuer:'', issue_date:'', expiry_date:'', renewal_required:false, file_name:null })
    } catch (err) { setLoadError(err?.message || 'Failed to add certification') }
  }

  const handleRenew = async () => {
    if (!renewForm.expiry_date) { alert('Expiry date is required'); return }
    try {
      await updateCertification(selectedCert.id, {
        issuer: renewForm.issuer || null,
        issue_date: renewForm.issue_date || null,
        expiry_date: renewForm.expiry_date || null,
        file_url: renewForm.file_name || null,
        renewal_required: false,
        status: computeStatus(renewForm.expiry_date)
      })
      await reloadCerts()
    } catch (err) { setLoadError(err?.message || 'Failed to renew certification') }
    setSelectedCert(null)
  }

  const openRenewDrawer = (c) => {
    setSelectedCert(c)
    setRenewForm({ issuer:c.issuer||'', issue_date:new Date().toISOString().split('T')[0], expiry_date:'', file_name:null })
  }

  return (
    <>
    <AppShell pageTitle="Certifications">
      <PageHeader eyebrow="Certifications" title="Certification queue" description="Track safety and trade certifications by expiry and renewal status."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Add Certification</button>} />

      <div className="summary-strip">
        {[['Expired',queues.expired.length,'danger','expired'],['Expiring soon',queues.expiring_soon.length,'warning','expiring_soon'],['Renewal required',queues.renewal_required.length,'warning','renewal_required'],['Valid',queues.valid.length,'success','valid']].map(([label,count,tone,key]) => (
          <div key={label} className="stat-card" style={{cursor:'pointer',borderBottom:queue===key?'2px solid var(--teal)':''}} onClick={() => setQueue(key)}>
            <div className={`num ${tone}`} style={{fontSize:20}}>{count}</div>
            <div className="lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          {['expired','expiring_soon','renewal_required','valid'].map(q => (
            <button key={q} className={`btn btn-sm ${queue===q?'btn-teal':'btn-secondary'}`} onClick={() => setQueue(q)}>{q.replace(/_/g,' ')}</button>
          ))}
        </div>
        {current.length === 0 ? <div className="empty-state"><h3>No certifications in this queue</h3></div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Worker</th><th>Certification</th><th>Issuer</th><th>Expiry</th><th>Renewal</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {current.map(c => {
                const wi = workerDisplay(c.worker_id)
                const exp = c.expiry_date ? new Date(c.expiry_date) : null
                const daysUntil = exp ? Math.ceil((exp - new Date()) / (1000*60*60*24)) : null
                return (
                <tr key={c.id} style={{cursor:'pointer'}} onClick={() => openRenewDrawer(c)}>
                  <td><div style={{fontWeight:500,color:'var(--teal)',display:'flex',alignItems:'center',gap:6}}>{wi.name_primary}{isInactive(c.worker_id) && <span style={{fontSize:10,fontWeight:600,color:'#64748b',background:'#e2e8f0',borderRadius:10,padding:'1px 6px'}}>Inactive</span>}</div><div style={{fontSize:11,color:'var(--hint)'}}>{wi.id_secondary}</div></td>
                  <td style={{fontWeight:500}}>{c.certification_type}</td>
                  <td style={{fontSize:12,color:'var(--muted)'}}>{c.issuer}</td>
                  <td style={{fontSize:12,color:c.status==='expired'?'var(--danger)':c.status==='expiring_soon'?'var(--warning)':'var(--muted)'}}>{formatDate(c.expiry_date)}{daysUntil !== null && <div style={{fontSize:10,color:daysUntil<0?'var(--danger)':daysUntil<=30?'var(--warning)':'var(--hint)'}}>{daysUntil < 0 ? Math.abs(daysUntil)+' days overdue' : daysUntil+' days left'}</div>}</td>
                  <td>{c.renewal_required ? <StatusBadge label="Required" tone="warning" /> : <StatusBadge label="No" tone="neutral" />}</td>
                  <td><StatusBadge label={c.status} tone={getStatusTone(c.status)} /></td>
                  <td style={{fontSize:11,color:'var(--hint)'}}>📎 Click to renew</td>
                </tr>)
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Add Certification" onClose={() => { setShowDrawer(false); setFormErrors([]) }}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px'}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Worker *</label><select className="form-select" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}</select></div>
              <div className="form-field"><label className="form-label">Certification type *</label><select className="form-select" value={form.cert_type} onChange={e => setForm({...form,cert_type:e.target.value})}>{CERT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Certificate number</label><input className="form-input" value={form.cert_number} onChange={e => setForm({...form,cert_number:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Issuer</label><input className="form-input" value={form.issuer} onChange={e => setForm({...form,issuer:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Issue date</label><input className="form-input" type="date" value={form.issue_date} onChange={e => setForm({...form,issue_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Expiry date *</label><input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm({...form,expiry_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Upload file</label><input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { const f=e.target.files[0]; if(f) setForm({...form,file_name:f.name}) }} /></div>
            </div>
            <div className="form-field"><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}><input type="checkbox" checked={form.renewal_required} onChange={e => setForm({...form,renewal_required:e.target.checked})} /><span className="form-label" style={{margin:0}}>Renewal required</span></label></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>

    {/* Renewal drawer — rendered outside AppShell for z-index */}
    {selectedCert && (() => {
      const wi = getWorkerDisplay(selectedCert.worker_id)
      const exp = selectedCert.expiry_date ? new Date(selectedCert.expiry_date) : null
      const daysUntil = exp ? Math.ceil((exp - new Date()) / (1000*60*60*24)) : null
      return (
      <div style={{position:'fixed',inset:0,zIndex:50}} onClick={() => setSelectedCert(null)}>
        <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.2)',backdropFilter:'blur(2px)'}} />
        <div style={{position:'fixed',right:0,top:0,width:420,height:'100vh',background:'#fff',borderLeft:'0.5px solid var(--border)',padding:24,overflowY:'auto',display:'flex',flexDirection:'column',gap:16,boxShadow:'-8px 0 32px rgba(15,23,42,.08)',zIndex:51}} onClick={e => e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',paddingBottom:16,borderBottom:'0.5px solid var(--border)'}}>
            <div>
              <div style={{fontSize:16,fontWeight:700}}>{selectedCert.certification_type}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{wi.name_primary} · {wi.id_secondary}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCert(null)}>✕</button>
          </div>

          {/* Current status */}
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>Current Status</div>
            <div style={{display:'flex',gap:8,marginBottom:10}}><StatusBadge label={selectedCert.status} tone={getStatusTone(selectedCert.status)} />{selectedCert.renewal_required && <StatusBadge label="Renewal required" tone="warning" />}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div><div style={{fontSize:11,color:'var(--hint)'}}>Issuer</div><div style={{fontSize:13,fontWeight:500}}>{selectedCert.issuer||'—'}</div></div>
              <div><div style={{fontSize:11,color:'var(--hint)'}}>Expiry</div><div style={{fontSize:13,fontWeight:500,color:selectedCert.status==='expired'?'var(--danger)':selectedCert.status==='expiring_soon'?'var(--warning)':'var(--text)'}}>{formatDate(selectedCert.expiry_date)}</div></div>
            </div>
            {daysUntil !== null && daysUntil < 0 && <div style={{marginTop:8,padding:'8px 12px',background:'var(--danger-bg)',border:'1px solid var(--danger-border)',borderRadius:6,fontSize:12,color:'var(--danger)'}}>⚠ Expired {Math.abs(daysUntil)} days ago — upload renewal immediately</div>}
            {daysUntil !== null && daysUntil > 0 && daysUntil <= 30 && <div style={{marginTop:8,padding:'8px 12px',background:'var(--warning-bg)',border:'1px solid var(--warning-border)',borderRadius:6,fontSize:12,color:'var(--warning)'}}>⏰ Expiring in {daysUntil} days — schedule renewal</div>}
          </div>

          {/* Renewal form */}
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>Renew / Upload New Certificate</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div className="form-field"><label className="form-label">Issuer</label><input className="form-input" value={renewForm.issuer} onChange={e => setRenewForm({...renewForm,issuer:e.target.value})} /></div>
              <div className="form-grid">
                <div className="form-field"><label className="form-label">New issue date</label><input className="form-input" type="date" value={renewForm.issue_date} onChange={e => setRenewForm({...renewForm,issue_date:e.target.value})} /></div>
                <div className="form-field"><label className="form-label">New expiry date *</label><input className="form-input" type="date" value={renewForm.expiry_date} onChange={e => setRenewForm({...renewForm,expiry_date:e.target.value})} /></div>
              </div>
              <div className="form-field"><label className="form-label">Upload file</label><input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { const f=e.target.files[0]; if(f) setRenewForm({...renewForm,file_name:f.name}) }} />{renewForm.file_name && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {renewForm.file_name}</div>}</div>
              <button className="btn btn-teal" style={{width:'100%'}} onClick={handleRenew}>Save Renewal</button>
            </div>
          </div>
        </div>
      </div>)
    })()}
    </>
  )
}

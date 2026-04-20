'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getAllDocumentsWithWorkers, upsertDocument } from '../../lib/documentService'
import { getVisibleWorkers } from '../../lib/workerService'
import { uploadWorkerDocument } from '../../lib/storageService'
import { DOCUMENT_TYPE_OPTIONS, getDocumentTypeOption, isDocumentExpiryRequired, normalizeDocumentType } from '../../lib/documentTypes'
import { formatDate, getStatusTone, getDocumentStatus, validateRequired, validateExpiryAfterIssue, validateDateNotPast } from '../../lib/utils'

const CATEGORIES = ['personal','employment','compliance','site','subcontractor','termination']

function statusForDocument(expiryDate, docType, hasFile) {
  if (!hasFile) return 'missing'
  if (!isDocumentExpiryRequired(docType)) return 'valid'
  return getDocumentStatus(expiryDate, docType)
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [workers, setWorkers] = useState([])
  const [queue, setQueue] = useState('missing')
  const [search, setSearch] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const [formWarnings, setFormWarnings] = useState([])
  const [form, setForm] = useState({ worker_id:'', document_category:'personal', document_type:'passport_copy', issue_date:'', expiry_date:'', notes:'', file_blob:null, file_name:null })
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [docDrawerForm, setDocDrawerForm] = useState({ issue_date:'', expiry_date:'', notes:'', file:null })

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const reloadDocs = async () => {
    const [ws, docs] = await Promise.all([getVisibleWorkers(), getAllDocumentsWithWorkers()])
    setWorkers(ws)
    // Compute per-doc status if missing, and alias schema fields for this page's legacy field names
    const today = new Date(); today.setHours(0,0,0,0)
    const normalised = docs.map(d => {
      const docType = normalizeDocumentType(d.doc_type)
      let status = d.status
      if (d.file_url && d.expiry_date) {
        const days = Math.ceil((new Date(d.expiry_date) - today) / (1000*60*60*24))
        if (days < 0) status = 'expired'
        else if (days <= 30) status = 'expiring_soon'
        else status = 'valid'
      } else if (d.file_url && !isDocumentExpiryRequired(docType)) {
        status = 'valid'
      } else if (!d.file_url) {
        status = 'missing'
      }
      return {
        ...d,
        doc_type: docType,
        status,
        document_type: docType,
        document_label: getDocumentTypeOption(docType).label,
        document_category: d.doc_subtype || '—',
      }
    })
    setDocuments(normalised)
  }

  const getWorkerFor = (id) => documents.find(d => d.worker_id === id)?.workers || workers.find(w => w.id === id) || null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        if (!cancelled) await reloadDocs()
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load documents')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const queues = {
    missing: documents.filter(d => d.status === 'missing'),
    expired: documents.filter(d => d.status === 'expired'),
    expiring_soon: documents.filter(d => d.status === 'expiring_soon'),
    contracts_due: documents.filter(d => (d.doc_type === 'employment_contract' || d.document_type === 'employment_contract') && d.status === 'missing'),
    valid: documents.filter(d => d.status === 'valid')
  }

  const workerDisplay = (wid) => {
    const w = getWorkerFor(wid)
    return { name_primary: w?.full_name || 'Unknown', id_secondary: w?.worker_number || '—' }
  }

  const current = queues[queue] || []
  const filtered = current.filter(d => {
    const q = search.toLowerCase()
    const worker = getWorkerFor(d.worker_id)
    return !search
      || d.worker_id?.toLowerCase().includes(q)
      || d.document_type?.toLowerCase().includes(q)
      || d.document_label?.toLowerCase().includes(q)
      || worker?.full_name?.toLowerCase().includes(q)
      || worker?.worker_number?.toLowerCase().includes(q)
  })

  function titleCase(str) { return (str || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

  const openDocDrawer = (d) => {
    setSelectedDoc(d)
    setDocDrawerForm({ issue_date: d.issue_date || '', expiry_date: d.expiry_date || '', notes: d.notes || '', file: null })
  }

  const handleSaveDoc = async () => {
    const docType = normalizeDocumentType(selectedDoc.doc_type || selectedDoc.document_type)
    const needsExpiry = isDocumentExpiryRequired(docType)
    if (needsExpiry && !docDrawerForm.expiry_date) return
    const worker = getWorkerFor(selectedDoc.worker_id)
    try {
      let fileUrl = selectedDoc.file_url || null
      if (docDrawerForm.file) {
        if (!worker?.worker_number) throw new Error('Worker data missing - cannot upload file')
        const { path, bucket } = await uploadWorkerDocument(worker, docType, docDrawerForm.file)
        fileUrl = `${bucket}::${path}`
      }
      const status = statusForDocument(docDrawerForm.expiry_date, docType, !!fileUrl)
      await upsertDocument(selectedDoc.worker_id, docType, {
        label: selectedDoc.label || docType,
        is_blocking: selectedDoc.is_blocking,
        issue_date: docDrawerForm.issue_date || null,
        expiry_date: docDrawerForm.expiry_date || null,
        status,
        file_url: fileUrl,
        notes: docDrawerForm.notes || null
      })
      await reloadDocs()
    } catch (err) { setLoadError(err?.message || 'Failed to save document') }
    setSelectedDoc(null)
  }

  const handleAdd = async () => {
    const docType = normalizeDocumentType(form.document_type)
    const needsExpiry = isDocumentExpiryRequired(docType)
    const errors = validateRequired([
      {value: form.worker_id, label:'Worker'},
      {value: form.document_type, label:'Document type'},
      ...(needsExpiry ? [{value: form.expiry_date, label:'Expiry date'}] : []),
    ])
    if (errors.length > 0) { setFormErrors(errors); return }
    const dateWarn = needsExpiry ? validateExpiryAfterIssue(form.issue_date, form.expiry_date) : null
    const pastWarn = needsExpiry ? validateDateNotPast(form.expiry_date, 'Expiry date') : null
    setFormWarnings([dateWarn, pastWarn].filter(Boolean))
    setFormErrors([])
    try {
      const worker = workers.find(w => w.id === form.worker_id)
      let fileUrl = null
      if (form.file_blob) {
        if (!worker?.worker_number) throw new Error('Worker data missing - cannot upload file')
        const { path, bucket } = await uploadWorkerDocument(worker, docType, form.file_blob)
        fileUrl = `${bucket}::${path}`
      }
      const status = statusForDocument(form.expiry_date, docType, !!fileUrl)
      await upsertDocument(form.worker_id, docType, {
        label: getDocumentTypeOption(docType).label,
        is_blocking: false,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        status,
        file_url: fileUrl,
        notes: form.notes || null
      })
      await reloadDocs()
    } catch (err) { setLoadError(err?.message || 'Failed to add document'); return }
    setShowDrawer(false)
    setFormWarnings([])
    setForm({ worker_id:'', document_category:'personal', document_type:'passport_copy', issue_date:'', expiry_date:'', notes:'', file_blob:null, file_name:null })
  }

  return (
    <>
    <AppShell pageTitle="Documents">
      <PageHeader eyebrow="Documents" title="Document risk queue" description="Work the document queue by status — missing, expired, expiring, and contracts due."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Add Document</button>} />

      <div className="summary-strip">
        {[['Missing',queues.missing.length,'danger'],['Expired',queues.expired.length,'danger'],['Expiring soon',queues.expiring_soon.length,'warning'],['Contracts due',queues.contracts_due.length,'warning'],].map(([label,count,tone]) => (
          <div key={label} className="stat-card" style={{cursor:'pointer',borderBottom: queue === label.toLowerCase().replace(' ','_') ? '2px solid var(--teal)' : ''}} onClick={() => setQueue(label.toLowerCase().replace(/ /g,'_'))}>
            <div className={`num ${tone}`} style={{fontSize:20}}>{count}</div>
            <div className="lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          <input className="search-input" placeholder="Search document type or worker ID..." value={search} onChange={e => setSearch(e.target.value)} style={{flex:1}} />
          <div style={{display:'flex',gap:6}}>
            {['missing','expired','expiring_soon','contracts_due','valid'].map(q => (
              <button key={q} className={`btn btn-sm ${queue===q?'btn-teal':'btn-secondary'}`} onClick={() => setQueue(q)}>{q.replace('_',' ')}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No documents in this queue</h3><p>All clear for this category.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Document type</th><th>Category</th><th>Issue date</th><th>Expiry</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} style={{cursor:'pointer'}} onClick={() => openDocDrawer(d)}>
                    <td>{(() => { const wi = workerDisplay(d.worker_id); const inactive = getWorkerFor(d.worker_id)?.status === 'inactive'; return <Link href={`/workers/${d.worker_id}`} style={{color:'var(--teal)'}}><div style={{fontWeight:500,display:'flex',alignItems:'center',gap:6}}>{wi.name_primary}{inactive && <span style={{fontSize:10,fontWeight:600,color:'#64748b',background:'#e2e8f0',borderRadius:10,padding:'1px 6px'}}>Inactive</span>}</div><div style={{fontSize:11,color:'var(--hint)'}}>{wi.id_secondary}</div></Link> })()}</td>
                    <td style={{fontWeight:500}}>{d.document_label || titleCase(d.document_type)}</td>
                    <td><StatusBadge label={d.document_category} tone="neutral" /></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(d.issue_date)}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(d.expiry_date)}</td>
                    <td><StatusBadge label={d.status} tone={getStatusTone(d.status)} /></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{d.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Add Document" onClose={() => { setShowDrawer(false); setFormErrors([]); setFormWarnings([]) }}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => { setShowDrawer(false); setFormErrors([]); setFormWarnings([]) }}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add Document</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            {formWarnings.length > 0 && <div style={{background:'var(--warning-bg)',border:'1px solid var(--warning-border)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formWarnings.map(w => <div key={w} style={{color:'var(--warning)',fontSize:12}}>⚠ {w}</div>)}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Worker *</label><select className="form-select" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}</select></div>
              <div className="form-field"><label className="form-label">Category</label><select className="form-select" value={form.document_category} onChange={e => setForm({...form,document_category:e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Document type *</label><select className="form-select" value={form.document_type} onChange={e => setForm({...form,document_type:e.target.value})}>{DOCUMENT_TYPE_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Issue date</label><input className="form-input" type="date" value={form.issue_date} onChange={e => setForm({...form,issue_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Expiry date{isDocumentExpiryRequired(form.document_type) ? ' *' : ''}</label><input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm({...form,expiry_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Upload file</label><input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG" onChange={e => {
                const file = e.target.files[0]
                if (!file) return
                const ext = file.name.split('.').pop()
                const worker = workers.find(w => w.id === form.worker_id)
                let autoName = file.name
                if (worker && form.document_type) {
                  const safeName = worker.full_name.replace(/\s+/g,'')
                  autoName = `${worker.worker_number}_${safeName}_${form.document_type}.${ext}`
                }
                setForm({...form, file_blob: file, file_name: autoName, file_original: file.name})
              }} />
              {form.file_name && (
                <div style={{marginTop:4}}>
                  <div style={{fontSize:11,color:'var(--teal)'}}>📎 Saved as: <strong>{form.file_name}</strong></div>
                  {form.file_original && form.file_original !== form.file_name && (
                    <div style={{fontSize:10,color:'var(--hint)'}}>Original: {form.file_original}</div>
                  )}
                </div>
              )}</div>
            </div>
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>

    {selectedDoc && (() => {
      const worker = getWorkerFor(selectedDoc.worker_id)
      const wi = workerDisplay(selectedDoc.worker_id)
      const exp = selectedDoc.expiry_date ? new Date(selectedDoc.expiry_date) : null
      const today = new Date()
      const days = exp ? Math.ceil((exp - today) / (1000*60*60*24)) : null
      const isContract = selectedDoc.document_type === 'employment_contract'
      const selectedNeedsExpiry = isDocumentExpiryRequired(selectedDoc.document_type)
      return (
      <div style={{position:'fixed',inset:0,zIndex:99}} onClick={() => setSelectedDoc(null)}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)'}} />
        <div style={{position:'fixed',right:0,top:0,width:460,height:'100vh',background:'#fff',borderLeft:'0.5px solid var(--border)',boxShadow:'-4px 0 24px rgba(0,0,0,0.12)',zIndex:100,display:'flex',flexDirection:'column',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

          <div style={{padding:'20px 24px',borderBottom:'0.5px solid var(--border)',flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:18,fontWeight:700}}>{selectedDoc.document_label || titleCase(selectedDoc.document_type)}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{wi.name_primary} · {wi.id_secondary}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDoc(null)}>✕</button>
            </div>
            <div style={{marginTop:10}}>
              <StatusBadge label={selectedDoc.status || 'missing'} tone={getStatusTone(selectedDoc.status || 'missing')} />
            </div>
          </div>

          <div style={{flex:1,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>Current Info</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>Issue date</div><div style={{fontSize:13,fontWeight:500}}>{selectedDoc.issue_date ? formatDate(selectedDoc.issue_date) : 'Not on file'}</div></div>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>Expiry date</div><div style={{fontSize:13,fontWeight:500,color:selectedDoc.status==='expired'?'var(--danger)':selectedDoc.status==='expiring_soon'?'var(--warning)':'var(--text)'}}>{selectedDoc.expiry_date ? formatDate(selectedDoc.expiry_date) : 'Not set'}</div></div>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>Category</div><StatusBadge label={selectedDoc.document_category || 'personal'} tone="neutral" /></div>
                {selectedDoc.notes && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--hint)'}}>Notes</div><div style={{fontSize:12}}>{selectedDoc.notes}</div></div>}
              </div>
            </div>

            {days !== null && days < 0 && <div style={{padding:'8px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,fontSize:12,color:'var(--danger)'}}>⚠ Expired {Math.abs(days)} days ago — upload renewal immediately</div>}
            {days !== null && days > 0 && days <= 30 && <div style={{padding:'8px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:6,fontSize:12,color:'var(--warning)'}}>⏰ Expiring in {days} days — schedule renewal</div>}
            {selectedDoc.status === 'missing' && <div style={{padding:'8px 12px',background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:6,fontSize:12,color:'#64748b'}}>📎 No document on file — upload below</div>}

            {isContract && <div style={{padding:'10px 14px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,fontSize:12,color:'#1e40af'}}>Unlimited Contract — renewal updates visa dates only. No new offer letter required.</div>}

            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>
                {selectedDoc.status === 'missing' ? 'Upload Document' : isContract ? 'Renew Contract' : 'Upload Renewal'}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">{isContract ? 'New contract start date' : 'New issue date'}</label>
                    <input className="form-input" type="date" value={docDrawerForm.issue_date} onChange={e => setDocDrawerForm(f => ({...f, issue_date: e.target.value}))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">{isContract ? 'New contract end date' : 'New expiry date'}{selectedNeedsExpiry ? ' *' : ''}</label>
                    <input className="form-input" type="date" value={docDrawerForm.expiry_date} onChange={e => setDocDrawerForm(f => ({...f, expiry_date: e.target.value}))} style={selectedNeedsExpiry && !docDrawerForm.expiry_date ? {borderColor:'var(--danger)'} : {}} />
                  </div>
                </div>
                <div className="form-field"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={docDrawerForm.notes} onChange={e => setDocDrawerForm(f => ({...f, notes: e.target.value}))} style={{resize:'vertical'}} /></div>
                <div className="form-field">
                  <label className="form-label">Upload file</label>
                  <input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { const f = e.target.files[0]; if (f) setDocDrawerForm(prev => ({...prev, file: f})) }} />
                  {docDrawerForm.file && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {docDrawerForm.file.name}</div>}
                </div>
                <button className="btn btn-teal" style={{width:'100%'}} disabled={selectedNeedsExpiry && !docDrawerForm.expiry_date} onClick={handleSaveDoc}>Save & Update</button>
              </div>
            </div>
          </div>
        </div>
      </div>)
    })()}
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getDocuments, addDocument, makeId } from '../../lib/mockStore'
import { formatDate, getStatusTone, getDocumentStatus } from '../../lib/utils'

const DOCUMENT_TYPES = ['passport','emirates_id','visa','photo','cv','offer_letter','employment_contract','labour_contract','labour_card','labour_permit','medical_fitness','medical_insurance','workers_compensation','unemployment_insurance','bank_account_details','site_induction','safety_orientation','site_access_card','subcontractor_agreement','subcontractor_trade_licence','subcontractor_insurance','resignation_letter','termination_notice','eos_calculation','exit_clearance','final_payslip','experience_letter']

const CATEGORIES = ['personal','employment','compliance','site','subcontractor','termination']

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [queue, setQueue] = useState('expired')
  const [search, setSearch] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ worker_id:'', document_category:'personal', document_type:'passport', issue_date:'', expiry_date:'', notes:'' })

  useEffect(() => { setDocuments(getDocuments()) }, [])

  const queues = {
    missing: documents.filter(d => d.status === 'missing'),
    expired: documents.filter(d => d.status === 'expired'),
    expiring_soon: documents.filter(d => d.status === 'expiring_soon'),
    contracts_due: documents.filter(d => d.document_type === 'employment_contract' && d.status === 'expiring_soon'),
    valid: documents.filter(d => d.status === 'valid')
  }

  const current = queues[queue] || []
  const filtered = current.filter(d => !search || d.worker_id?.toLowerCase().includes(search.toLowerCase()) || d.document_type?.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = () => {
    const status = getDocumentStatus(form.expiry_date, form.document_type)
    const doc = { ...form, id: makeId('doc'), status, file_url: null, file_name: null, locked: false, unlock_reason: null }
    addDocument(doc)
    setDocuments(getDocuments())
    setShowDrawer(false)
  }

  return (
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
              <thead><tr><th>Worker ID</th><th>Document type</th><th>Category</th><th>Issue date</th><th>Expiry</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td><Link href={`/workers/${d.worker_id}`} style={{color:'var(--teal)',fontWeight:500}}>{d.worker_id}</Link></td>
                    <td style={{fontWeight:500}}>{d.document_type}</td>
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
        <DrawerForm title="Add Document" onClose={() => setShowDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add Document</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Worker ID</label><input className="form-input" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})} placeholder="w-001" /></div>
              <div className="form-field"><label className="form-label">Category</label><select className="form-select" value={form.document_category} onChange={e => setForm({...form,document_category:e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Document type</label><select className="form-select" value={form.document_type} onChange={e => setForm({...form,document_type:e.target.value})}>{DOCUMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Issue date</label><input className="form-input" type="date" value={form.issue_date} onChange={e => setForm({...form,issue_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Expiry date</label><input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm({...form,expiry_date:e.target.value})} /></div>
            </div>
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

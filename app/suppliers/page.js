'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { addSupplier, addSupplierRate, getSuppliers, getSupplierRates, getSupplierWorkers, getAllSupplierSummaries, updateSupplier, updateSupplierSummary } from '../../lib/supplierService'
import { getRole } from '../../lib/mockAuth'
import { formatCurrency, formatDate } from '../../lib/utils'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMonth(year, month) {
  const m = Number(month)
  return `${MONTH_NAMES[m - 1] || month} ${year}`
}

function SupplierCard({ supplier, onEdit }) {
  const [rates, setRates] = useState([])
  const [workerCount, setWorkerCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [r, w] = await Promise.all([
        getSupplierRates(supplier.id),
        getSupplierWorkers(supplier.id),
      ])
      if (cancelled) return
      setRates(r || [])
      setWorkerCount((w || []).length)
    })()
    return () => { cancelled = true }
  }, [supplier.id])

  return (
    <div className="panel" style={{padding:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>{supplier.name}</div>
            <StatusBadge label="Active" tone="success" />
            <span style={{display:'inline-block',fontSize:11,padding:'2px 8px',borderRadius:10,background:'#0d9488',color:'#fff',fontWeight:500}}>{workerCount} workers on site</span>
          </div>
          {supplier.trade_speciality && <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{supplier.trade_speciality}</div>}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(supplier)}>Edit</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,fontSize:12,marginBottom:12}}>
        <div>
          <div style={{color:'var(--hint)',fontSize:11,textTransform:'uppercase',letterSpacing:0.5}}>PO</div>
          <div style={{fontWeight:500}}>{supplier.po_number || '—'}</div>
          {supplier.po_value ? <div style={{fontSize:11,color:'var(--muted)'}}>{formatCurrency(supplier.po_value)}</div> : null}
          {(supplier.po_start_date || supplier.po_end_date) && (
            <div style={{fontSize:11,color:'var(--muted)'}}>{formatDate(supplier.po_start_date)} → {formatDate(supplier.po_end_date)}</div>
          )}
        </div>
        <div>
          <div style={{color:'var(--hint)',fontSize:11,textTransform:'uppercase',letterSpacing:0.5}}>Contact</div>
          <div style={{fontWeight:500}}>{supplier.contact_person || '—'}</div>
          {(supplier.email || supplier.contact_email) && <div style={{fontSize:11,color:'var(--muted)'}}>{supplier.email || supplier.contact_email}</div>}
          {(supplier.phone || supplier.contact_phone) && <div style={{fontSize:11,color:'var(--muted)'}}>{supplier.phone || supplier.contact_phone}</div>}
        </div>
      </div>

      {rates.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trade / role</th><th>AED / hr</th><th>Effective from</th></tr></thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.id}>
                  <td>{r.trade_role}</td>
                  <td>{formatCurrency(r.hourly_rate)}</td>
                  <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(r.effective_from)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function SuppliersPage() {
  const [tab, setTab] = useState('suppliers')
  const [suppliers, setSuppliers] = useState([])
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ name:'', trade_speciality:'', contact_person:'', email:'', phone:'', po_number:'', po_value:'', po_start_date:'', po_end_date:'', payment_terms:'30 days', notes:'' })
  const [addForm, setAddForm] = useState({ name:'', trade_speciality:'', contact_person:'', email:'', phone:'', address:'', po_number:'', po_value:'', po_start_date:'', po_end_date:'', payment_terms:'30 days', notes:'', first_trade_role:'', first_hourly_rate:'', first_effective_from:new Date().toISOString().split('T')[0] })
  const [formError, setFormError] = useState('')
  const [invoiceFor, setInvoiceFor] = useState(null)
  const [invoiceForm, setInvoiceForm] = useState({ invoice_number:'', invoice_amount:'', invoice_date:'' })

  const refresh = async () => {
    setLoading(true)
    const [s, sm] = await Promise.all([getSuppliers(), getAllSupplierSummaries()])
    setSuppliers(s || [])
    setSummaries(sm || [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const handleEdit = (supplier) => {
    setEditing(supplier)
    setEditForm({
      name: supplier.name || '',
      trade_speciality: supplier.trade_speciality || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || supplier.contact_email || '',
      phone: supplier.phone || supplier.contact_phone || '',
      po_number: supplier.po_number || '',
      po_value: supplier.po_value || '',
      po_start_date: supplier.po_start_date || '',
      po_end_date: supplier.po_end_date || '',
      payment_terms: supplier.payment_terms || '30 days',
      notes: supplier.notes || '',
    })
  }

  const handleAddSupplier = async () => {
    if (!addForm.name.trim()) {
      setFormError('Supplier company name is required')
      return
    }
    setFormError('')
    const supplier = await addSupplier({
      name: addForm.name.trim(),
      trade_speciality: addForm.trade_speciality || null,
      contact_person: addForm.contact_person || null,
      email: addForm.email || null,
      phone: addForm.phone || null,
      address: addForm.address || null,
      po_number: addForm.po_number || null,
      po_value: addForm.po_value === '' ? null : Number(addForm.po_value),
      po_start_date: addForm.po_start_date || null,
      po_end_date: addForm.po_end_date || null,
      payment_terms: addForm.payment_terms || '30 days',
      notes: addForm.notes || null,
      active: true,
    })
    if (!supplier?.id) {
      setFormError('Could not create supplier company')
      return
    }
    if (addForm.first_trade_role && addForm.first_hourly_rate) {
      await addSupplierRate(
        supplier.id,
        addForm.first_trade_role,
        Number(addForm.first_hourly_rate),
        addForm.first_effective_from || new Date().toISOString().split('T')[0],
        'Initial supplier onboarding rate'
      )
    }
    setShowAdd(false)
    setAddForm({ name:'', trade_speciality:'', contact_person:'', email:'', phone:'', address:'', po_number:'', po_value:'', po_start_date:'', po_end_date:'', payment_terms:'30 days', notes:'', first_trade_role:'', first_hourly_rate:'', first_effective_from:new Date().toISOString().split('T')[0] })
    await refresh()
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    const updates = {
      ...editForm,
      po_value: editForm.po_value === '' ? null : Number(editForm.po_value),
      po_start_date: editForm.po_start_date || null,
      po_end_date: editForm.po_end_date || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      trade_speciality: editForm.trade_speciality || null,
      payment_terms: editForm.payment_terms || '30 days',
      notes: editForm.notes || null,
    }
    await updateSupplier(editing.id, updates)
    setEditing(null)
    await refresh()
  }

  const handleMarkSent = async (row) => {
    await updateSupplierSummary(row.id, { status: 'sent', sent_at: new Date().toISOString(), sent_by: getRole() })
    await refresh()
  }

  const handleMarkPaid = async (row) => {
    await updateSupplierSummary(row.id, { status: 'paid', paid_at: new Date().toISOString() })
    await refresh()
  }

  const handleRecordInvoice = async () => {
    if (!invoiceFor) return
    await updateSupplierSummary(invoiceFor.id, {
      status: 'invoiced',
      invoice_number: invoiceForm.invoice_number,
      invoice_amount: invoiceForm.invoice_amount === '' ? null : Number(invoiceForm.invoice_amount),
      invoice_date: invoiceForm.invoice_date || null,
    })
    setInvoiceFor(null)
    setInvoiceForm({ invoice_number:'', invoice_amount:'', invoice_date:'' })
    await refresh()
  }

  const statusTone = (s) => ({ draft:'neutral', sent:'info', invoiced:'warning', paid:'success' }[s] || 'neutral')

  return (
    <AppShell pageTitle="Suppliers">
      <PageHeader
        eyebrow="Suppliers"
        title="Supplier register"
        description="Create supplier companies first, then onboard their workers against the company and agreed rates."
        actions={<button className="btn btn-primary" onClick={() => { setFormError(''); setShowAdd(true) }}>+ Add Supplier Company</button>}
      />

      <div style={{background:'#0d9488',color:'#fff',borderRadius:8,padding:'10px 14px',fontSize:12,lineHeight:1.5,marginBottom:10}}>
        Supplier companies provide their own workers under a PO. Workers are billed hourly and tracked via monthly timesheet summaries.
      </div>

      <div style={{display:'flex',gap:4,borderBottom:'1px solid var(--border)',marginBottom:12}}>
        {[['suppliers','Suppliers & Rates'],['summaries','Monthly Summaries']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)} className="btn btn-ghost btn-sm"
            style={{borderRadius:0,borderBottom: tab===k ? '2px solid #0d9488' : '2px solid transparent',color: tab===k ? '#0d9488' : 'var(--muted)',fontWeight: tab===k ? 600 : 400,padding:'8px 14px'}}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="empty-state"><p>Loading…</p></div> : tab === 'suppliers' ? (
        suppliers.length === 0 ? <div className="empty-state"><h3>No suppliers yet</h3><p>Add a supplier to start tracking rates and timesheets.</p></div> : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {suppliers.map(s => <SupplierCard key={s.id} supplier={s} onEdit={handleEdit} />)}
          </div>
        )
      ) : (
        <div className="panel">
          {summaries.length === 0 ? <div className="empty-state"><h3>No monthly summaries yet</h3></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Supplier</th><th>Month</th><th>Workers</th><th>Hours</th><th>Amount (AED)</th><th>PO</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {summaries.map(r => (
                    <tr key={r.id}>
                      <td style={{fontWeight:500}}>{r.supplier?.name || '—'}</td>
                      <td>{fmtMonth(r.year, r.month)}</td>
                      <td style={{textAlign:'right'}}>{r.worker_count ?? '—'}</td>
                      <td style={{textAlign:'right'}}>{r.total_hours ?? '—'}</td>
                      <td style={{textAlign:'right',fontWeight:500}}>{r.total_amount != null ? formatCurrency(r.total_amount) : '—'}</td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{r.po_number || r.supplier?.po_number || '—'}</td>
                      <td><StatusBadge label={r.status || 'draft'} tone={statusTone(r.status)} /></td>
                      <td>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {r.status === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => handleMarkSent(r)}>Mark Sent</button>}
                          {r.status === 'sent' && <button className="btn btn-teal btn-sm" onClick={() => { setInvoiceFor(r); setInvoiceForm({ invoice_number:'', invoice_amount: r.total_amount || '', invoice_date:'' }) }}>Record Invoice</button>}
                          {r.status === 'invoiced' && <button className="btn btn-teal btn-sm" onClick={() => handleMarkPaid(r)}>Mark Paid</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <DrawerForm title="Add Supplier Company" subtitle="Create the company before onboarding supplier workers" onClose={() => setShowAdd(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddSupplier}>Create Supplier</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formError && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,padding:'10px 12px',fontSize:12,color:'var(--danger)',fontWeight:600}}>{formError}</div>}
            <div style={{background:'#f8fafc',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--muted)',lineHeight:1.5}}>
              Add the supplier company, PO, and at least one agreed rate. Supplier workers can then be selected under Onboarding &gt; Supplier Company Workers.
            </div>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Supplier company name *</label><input className="form-input" value={addForm.name} onChange={e => setAddForm({...addForm, name:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Trade speciality</label><input className="form-input" value={addForm.trade_speciality} onChange={e => setAddForm({...addForm, trade_speciality:e.target.value})} placeholder="Scaffolding, rigging, MEP..." /></div>
              <div className="form-field"><label className="form-label">Contact person</label><input className="form-input" value={addForm.contact_person} onChange={e => setAddForm({...addForm, contact_person:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Phone</label><input className="form-input" value={addForm.phone} onChange={e => setAddForm({...addForm, phone:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Payment terms</label><input className="form-input" value={addForm.payment_terms} onChange={e => setAddForm({...addForm, payment_terms:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">PO number</label><input className="form-input" value={addForm.po_number} onChange={e => setAddForm({...addForm, po_number:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">PO value (AED)</label><input className="form-input" type="number" value={addForm.po_value} onChange={e => setAddForm({...addForm, po_value:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">PO start</label><input className="form-input" type="date" value={addForm.po_start_date} onChange={e => setAddForm({...addForm, po_start_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">PO end</label><input className="form-input" type="date" value={addForm.po_end_date} onChange={e => setAddForm({...addForm, po_end_date:e.target.value})} /></div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5}}>Initial Rate</div>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Trade / role</label><input className="form-input" value={addForm.first_trade_role} onChange={e => setAddForm({...addForm, first_trade_role:e.target.value})} placeholder="Welder, Rigger, Scaffolder" /></div>
              <div className="form-field"><label className="form-label">Hourly rate (AED)</label><input className="form-input" type="number" value={addForm.first_hourly_rate} onChange={e => setAddForm({...addForm, first_hourly_rate:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Effective from</label><input className="form-input" type="date" value={addForm.first_effective_from} onChange={e => setAddForm({...addForm, first_effective_from:e.target.value})} /></div>
            </div>
            <div className="form-field"><label className="form-label">Address</label><textarea className="form-textarea" rows={2} value={addForm.address} onChange={e => setAddForm({...addForm, address:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" rows={2} value={addForm.notes} onChange={e => setAddForm({...addForm, notes:e.target.value})} /></div>
          </div>
        </DrawerForm>
      )}

      {editing && (
        <DrawerForm title="Edit Supplier" subtitle={editing.name} onClose={() => setEditing(null)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSaveEdit}>Save</button></div>}>
          <div className="form-grid">
            <div className="form-field"><label className="form-label">Supplier name</label><input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Trade speciality</label><input className="form-input" value={editForm.trade_speciality} onChange={e => setEditForm({...editForm, trade_speciality:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Contact person</label><input className="form-input" value={editForm.contact_person} onChange={e => setEditForm({...editForm, contact_person:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Contact email</label><input className="form-input" value={editForm.email} onChange={e => setEditForm({...editForm, email:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Contact phone</label><input className="form-input" value={editForm.phone} onChange={e => setEditForm({...editForm, phone:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO number</label><input className="form-input" value={editForm.po_number} onChange={e => setEditForm({...editForm, po_number:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO value (AED)</label><input className="form-input" type="number" value={editForm.po_value} onChange={e => setEditForm({...editForm, po_value:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO start</label><input className="form-input" type="date" value={editForm.po_start_date} onChange={e => setEditForm({...editForm, po_start_date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO end</label><input className="form-input" type="date" value={editForm.po_end_date} onChange={e => setEditForm({...editForm, po_end_date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Payment terms</label><input className="form-input" value={editForm.payment_terms} onChange={e => setEditForm({...editForm, payment_terms:e.target.value})} /></div>
          </div>
          <div className="form-field" style={{marginTop:14}}><label className="form-label">Notes</label><textarea className="form-textarea" rows={2} value={editForm.notes} onChange={e => setEditForm({...editForm, notes:e.target.value})} /></div>
        </DrawerForm>
      )}

      {invoiceFor && (
        <DrawerForm title="Record Invoice" subtitle={`${invoiceFor.supplier?.name || ''} — ${fmtMonth(invoiceFor.year, invoiceFor.month)}`} onClose={() => setInvoiceFor(null)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setInvoiceFor(null)}>Cancel</button><button className="btn btn-primary" onClick={handleRecordInvoice}>Save Invoice</button></div>}>
          <div className="form-grid">
            <div className="form-field"><label className="form-label">Invoice number</label><input className="form-input" value={invoiceForm.invoice_number} onChange={e => setInvoiceForm({...invoiceForm, invoice_number:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Invoice amount (AED)</label><input className="form-input" type="number" value={invoiceForm.invoice_amount} onChange={e => setInvoiceForm({...invoiceForm, invoice_amount:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Invoice date</label><input className="form-input" type="date" value={invoiceForm.invoice_date} onChange={e => setInvoiceForm({...invoiceForm, invoice_date:e.target.value})} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getSuppliers, getSupplierRates, getSupplierWorkers, getAllSupplierSummaries, updateSupplier, updateSupplierSummary } from '../../lib/supplierService'
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
          {supplier.contact_email && <div style={{fontSize:11,color:'var(--muted)'}}>{supplier.contact_email}</div>}
          {supplier.contact_phone && <div style={{fontSize:11,color:'var(--muted)'}}>{supplier.contact_phone}</div>}
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
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ name:'', contact_person:'', contact_email:'', contact_phone:'', po_number:'', po_value:'', po_start_date:'', po_end_date:'' })
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
      contact_person: supplier.contact_person || '',
      contact_email: supplier.contact_email || '',
      contact_phone: supplier.contact_phone || '',
      po_number: supplier.po_number || '',
      po_value: supplier.po_value || '',
      po_start_date: supplier.po_start_date || '',
      po_end_date: supplier.po_end_date || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    const updates = {
      ...editForm,
      po_value: editForm.po_value === '' ? null : Number(editForm.po_value),
      po_start_date: editForm.po_start_date || null,
      po_end_date: editForm.po_end_date || null,
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
      <PageHeader eyebrow="Suppliers" title="Supplier register" description="Manage supplier companies, PO-based rates, and monthly timesheet summaries." />

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

      {editing && (
        <DrawerForm title="Edit Supplier" subtitle={editing.name} onClose={() => setEditing(null)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSaveEdit}>Save</button></div>}>
          <div className="form-grid">
            <div className="form-field"><label className="form-label">Supplier name</label><input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Contact person</label><input className="form-input" value={editForm.contact_person} onChange={e => setEditForm({...editForm, contact_person:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Contact email</label><input className="form-input" value={editForm.contact_email} onChange={e => setEditForm({...editForm, contact_email:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Contact phone</label><input className="form-input" value={editForm.contact_phone} onChange={e => setEditForm({...editForm, contact_phone:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO number</label><input className="form-input" value={editForm.po_number} onChange={e => setEditForm({...editForm, po_number:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO value (AED)</label><input className="form-input" type="number" value={editForm.po_value} onChange={e => setEditForm({...editForm, po_value:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO start</label><input className="form-input" type="date" value={editForm.po_start_date} onChange={e => setEditForm({...editForm, po_start_date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">PO end</label><input className="form-input" type="date" value={editForm.po_end_date} onChange={e => setEditForm({...editForm, po_end_date:e.target.value})} /></div>
          </div>
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

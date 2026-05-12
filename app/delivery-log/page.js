'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getVisibleWorkers } from '../../lib/workerService'
import { addDeliveryLog, getDeliveryLogs, updateDeliveryLog } from '../../lib/deliveryService'
import { getRole } from '../../lib/mockAuth'
import { formatDate } from '../../lib/utils'

const TYPE_OPTIONS = [
  ['payslip', 'Payslip'],
  ['warning', 'Warning'],
  ['letter', 'Letter'],
  ['document_pack', 'Document pack'],
  ['other', 'Other'],
]

const METHOD_OPTIONS = [
  ['manual', 'Manual'],
  ['email', 'Email'],
  ['whatsapp', 'WhatsApp'],
  ['download', 'Downloaded'],
  ['printed', 'Printed'],
  ['other', 'Other'],
]

const STATUS_OPTIONS = [
  ['recorded', 'Recorded'],
  ['queued', 'Queued'],
  ['sent', 'Sent'],
  ['failed', 'Failed'],
  ['acknowledged', 'Acknowledged'],
]

function statusTone(status) {
  return {
    acknowledged: 'success',
    sent: 'success',
    recorded: 'info',
    queued: 'warning',
    failed: 'danger',
  }[status] || 'neutral'
}

export default function DeliveryLogPage() {
  const [logs, setLogs] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    worker_id: '',
    delivery_type: 'payslip',
    method: 'manual',
    status: 'recorded',
    recipient: '',
    notes: '',
  })

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [nextLogs, nextWorkers] = await Promise.all([getDeliveryLogs(), getVisibleWorkers()])
      setLogs(nextLogs)
      setWorkers(nextWorkers)
    } catch (err) {
      setError(err.message || 'Could not load delivery logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const workerById = useMemo(() => new Map(workers.map(worker => [worker.id, worker])), [workers])
  const filtered = logs.filter(row => {
    if (typeFilter !== 'all' && row.delivery_type !== typeFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [row.worker_number, row.worker_name, row.recipient, row.method, row.status, row.notes]
      .some(value => String(value || '').toLowerCase().includes(q))
  })

  const submit = async () => {
    const worker = workerById.get(form.worker_id)
    if (!worker) {
      setError('Select a worker first.')
      return
    }
    setError('')
    await addDeliveryLog({
      ...form,
      worker_number: worker.worker_number,
      worker_name: worker.full_name,
      sent_by: getRole(),
    })
    setShowAdd(false)
    setForm({ worker_id: '', delivery_type: 'payslip', method: 'manual', status: 'recorded', recipient: '', notes: '' })
    await refresh()
  }

  const acknowledge = async (row) => {
    await updateDeliveryLog(row.id, { status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    await refresh()
  }

  return (
    <AppShell pageTitle="Delivery Log">
      <PageHeader
        eyebrow="Records"
        title="Delivery log"
        description="Record how payslips, warnings, letters, and document packs were sent."
        actions={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>Log Delivery</button>}
      />

      {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#991b1b',marginBottom:12}}>{error}</div>}

      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
        <input className="form-input" style={{maxWidth:360}} placeholder="Search worker, recipient, method, notes..." value={query} onChange={e => setQuery(e.target.value)} />
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="panel">
        {loading ? <div className="empty-state"><p>Loading...</p></div> : filtered.length === 0 ? (
          <div className="empty-state"><h3>No delivery records found</h3><p>Log the first delivery when HR sends a payslip, warning, letter, or document pack.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Type</th><th>Method</th><th>Recipient</th><th>Status</th><th>Sent</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td><div style={{fontWeight:600,fontSize:13}}>{row.worker_name || '-'}</div><div style={{fontSize:11,color:'var(--hint)',fontFamily:'monospace'}}>{row.worker_number || '-'}</div></td>
                    <td>{TYPE_OPTIONS.find(([value]) => value === row.delivery_type)?.[1] || row.delivery_type}</td>
                    <td>{METHOD_OPTIONS.find(([value]) => value === row.method)?.[1] || row.method}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{row.recipient || '-'}</td>
                    <td><StatusBadge label={row.status} tone={statusTone(row.status)} /></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(row.sent_at || row.created_at)}</td>
                    <td>{row.status !== 'acknowledged' && <button className="btn btn-secondary btn-sm" onClick={() => acknowledge(row)}>Mark Acknowledged</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <DrawerForm title="Log Delivery" subtitle="Record what was sent and how" onClose={() => setShowAdd(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Save Delivery</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-field">
              <label className="form-label">Worker *</label>
              <select className="form-select" value={form.worker_id} onChange={e => setForm({ ...form, worker_id: e.target.value })}>
                <option value="">Select worker</option>
                {workers.map(worker => <option key={worker.id} value={worker.id}>{worker.worker_number} - {worker.full_name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Type</label><select className="form-select" value={form.delivery_type} onChange={e => setForm({ ...form, delivery_type: e.target.value })}>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Method</label><select className="form-select" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{METHOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Recipient</label><input className="form-input" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} placeholder="Email, phone, name, or hand delivery" /></div>
            </div>
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getLeaveRecords, addLeaveRecord, updateLeaveRecord, getWorkers, makeId } from '../../lib/mockStore'
import { formatDate, getStatusTone } from '../../lib/utils'

export default function LeavePage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ worker_id:'', leave_type:'annual', start_date:'', end_date:'', notes:'' })

  useEffect(() => { setRecords(getLeaveRecords()); setWorkers(getWorkers()) }, [])

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)

  const handleAdd = () => {
    const worker = workers.find(w => w.id === form.worker_id)
    const start = new Date(form.start_date)
    const end = new Date(form.end_date)
    const days = Math.max(1, Math.ceil((end - start) / (1000*60*60*24)) + 1)
    addLeaveRecord({ ...form, id: makeId('lv'), worker_name: worker?.full_name||'', worker_number: worker?.worker_number||'', days_count: days, status:'pending', approved_by: null })
    setRecords(getLeaveRecords())
    setShowDrawer(false)
  }

  const handleAction = (id, status) => {
    updateLeaveRecord(id, { status, approved_by: status === 'approved' ? 'Owner' : 'HR Admin' })
    setRecords(getLeaveRecords())
  }

  return (
    <AppShell pageTitle="Leave">
      <PageHeader eyebrow="Leave" title="Leave register" description="Track and approve annual leave, sick leave, and unpaid leave."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Add Leave</button>} />

      <div className="summary-strip">
        {[['Pending',records.filter(r=>r.status==='pending').length,'warning'],['Approved',records.filter(r=>r.status==='approved').length,'success'],['Rejected',records.filter(r=>r.status==='rejected').length,'danger'],['Total days',records.filter(r=>r.status==='approved').reduce((s,r)=>s+r.days_count,0),'info']].map(([label,count,tone]) => (
          <div key={label} className="stat-card"><div className={`num ${tone}`} style={{fontSize:20}}>{count}</div><div className="lbl">{label}</div></div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          {['all','pending','approved','rejected'].map(s => <button key={s} className={`btn btn-sm ${filter===s?'btn-teal':'btn-secondary'}`} onClick={() => setFilter(s)}>{s}</button>)}
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No leave records</h3></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{fontWeight:500}}>{r.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{r.worker_number}</div></td>
                    <td><StatusBadge label={r.leave_type} tone="neutral" /></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(r.start_date)}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(r.end_date)}</td>
                    <td style={{fontWeight:500}}>{r.days_count}</td>
                    <td><StatusBadge label={r.status} tone={getStatusTone(r.status)} /></td>
                    <td>
                      {r.status === 'pending' && <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-teal btn-sm" onClick={() => handleAction(r.id,'approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleAction(r.id,'rejected')}>Reject</button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Add Leave Record" onClose={() => setShowDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add Leave</button></div>}>
          <div className="form-grid">
            <div className="form-field"><label className="form-label">Worker</label><select className="form-select" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name}</option>)}</select></div>
            <div className="form-field"><label className="form-label">Leave type</label><select className="form-select" value={form.leave_type} onChange={e => setForm({...form,leave_type:e.target.value})}><option value="annual">Annual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option><option value="emergency">Emergency</option></select></div>
            <div className="form-field"><label className="form-label">Start date</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({...form,start_date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">End date</label><input className="form-input" type="date" value={form.end_date} onChange={e => setForm({...form,end_date:e.target.value})} /></div>
            <div className="form-field span-2"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

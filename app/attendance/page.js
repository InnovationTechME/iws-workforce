'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import {
  getAttendance, addAttendanceRecord, getWorkers,
  getWorkerOffenceCount, addWarning, addPenaltyDeduction, makeId, getWorker
} from '../../lib/mockStore'
import { formatDate, getDailyRate } from '../../lib/utils'

const REASON_LABELS = {
  sick_with_cert: 'Sick — certificate provided',
  absent_no_cert: 'Absent — no certificate',
  late: 'Late arrival',
}

export default function AttendancePage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterWorker, setFilterWorker] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const [form, setForm] = useState({
    worker_id: '',
    date: new Date().toISOString().split('T')[0],
    reason: 'absent_no_cert',
    cert_filename: null,
    notes: ''
  })

  useEffect(() => {
    setRecords(getAttendance())
    setWorkers(getWorkers().filter(w => w.active !== false))
  }, [])

  const dayRecords = records.filter(r => r.date === selectedDate)

  const listRecords = filterWorker === 'all'
    ? records
    : records.filter(r => r.worker_id === filterWorker)

  const handleSubmit = () => {
    const errors = []
    if (!form.worker_id) errors.push('Worker is required')
    if (!form.date) errors.push('Date is required')
    if (!form.reason) errors.push('Reason is required')
    if (form.reason === 'sick_with_cert' && !form.cert_filename) errors.push('Certificate file is required for sick leave with certificate')
    if (errors.length > 0) { setFormErrors(errors); return }

    const worker = getWorker(form.worker_id)
    const offenceCount = getWorkerOffenceCount(form.worker_id)
    const isOffence = form.reason === 'absent_no_cert'
    const newOffenceNumber = isOffence ? offenceCount + 1 : 0
    const noPayNoWork = form.reason !== 'late'
    const allowanceSuspended = form.reason === 'absent_no_cert'
    let autoWarningId = null

    if (form.reason === 'absent_no_cert') {
      autoWarningId = makeId('wm')
      let penaltyAmount = 0
      let penaltyType = ''
      let warningReason = ''

      if (newOffenceNumber === 1) {
        warningReason = `1st offence — absent without certificate on ${form.date}. No-work-no-pay and allowance suspended. No financial penalty.`
      } else {
        const dailyRate = getDailyRate(worker)
        penaltyAmount = Math.round(dailyRate * 2 * 100) / 100
        penaltyType = 'deduction'
        warningReason = `${newOffenceNumber === 2 ? '2nd' : `${newOffenceNumber}th`} offence — absent without certificate on ${form.date}. No-work-no-pay + 2-day penalty applied.`
      }

      addWarning({
        id: autoWarningId,
        worker_id: form.worker_id,
        worker_name: worker?.full_name || '',
        worker_number: worker?.worker_number || '',
        warning_type: 'warning',
        issue_date: form.date,
        reason: warningReason,
        issued_by: 'System — Attendance',
        status: 'open',
        penalty_amount: penaltyAmount || '',
        penalty_type: penaltyType,
        notes: `Auto-generated from attendance log. Offence #${newOffenceNumber}`
      })

      if (newOffenceNumber >= 2 && penaltyAmount > 0) {
        addPenaltyDeduction({
          id: makeId('pd'),
          warning_id: autoWarningId,
          worker_id: form.worker_id,
          worker_name: worker?.full_name || '',
          worker_number: worker?.worker_number || '',
          label: `Attendance penalty — ${newOffenceNumber === 2 ? '2nd' : `${newOffenceNumber}th`} offence (${form.date})`,
          amount: penaltyAmount,
          type: penaltyType,
          status: 'pending_hr_confirmation',
          created_at: form.date
        })
      }
    }

    addAttendanceRecord({
      id: makeId('att'),
      worker_id: form.worker_id,
      worker_name: worker?.full_name || '',
      worker_number: worker?.worker_number || '',
      date: form.date,
      reason: form.reason,
      cert_filename: form.cert_filename,
      no_work_no_pay: noPayNoWork,
      allowance_suspended: allowanceSuspended,
      auto_warning_created: form.reason === 'absent_no_cert',
      auto_warning_id: autoWarningId,
      offence_number: newOffenceNumber,
      notes: form.notes
    })

    setRecords(getAttendance())
    setShowDrawer(false)
    setForm({ worker_id:'', date: new Date().toISOString().split('T')[0], reason:'absent_no_cert', cert_filename:null, notes:'' })
    setFormErrors([])
  }

  const toneMap = {
    sick_with_cert: 'warning',
    absent_no_cert: 'danger',
    late: 'neutral'
  }

  const absentToday = dayRecords.filter(r => r.reason === 'absent_no_cert').length
  const sickToday = dayRecords.filter(r => r.reason === 'sick_with_cert').length
  const lateToday = dayRecords.filter(r => r.reason === 'late').length
  const penaltiesThisMonth = records.filter(r => r.offence_number >= 2).length

  return (
    <AppShell pageTitle="Attendance">
      <PageHeader
        eyebrow="Attendance"
        title="Daily absence log"
        description="Log daily absences, late arrivals, and sick leave. Uncertified absences auto-generate warnings and payroll deductions."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Log Absence</button>}
      />

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${absentToday > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{absentToday}</div><div className="lbl">Absent today (no cert)</div></div>
        <div className="stat-card"><div className={`num ${sickToday > 0 ? 'warning' : ''}`} style={{fontSize:20}}>{sickToday}</div><div className="lbl">Sick today (cert)</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{lateToday}</div><div className="lbl">Late today</div></div>
        <div className="stat-card"><div className={`num ${penaltiesThisMonth > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{penaltiesThisMonth}</div><div className="lbl">Penalties this month</div></div>
      </div>

      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-header">
          <div><h2>Day view</h2><p>Select a date to see all absences logged for that day</p></div>
          <input
            type="date"
            className="form-input"
            style={{width:160}}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        {dayRecords.length === 0 ? (
          <div style={{padding:'12px 0',fontSize:13,color:'var(--hint)'}}>No absences logged for {formatDate(selectedDate)}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Reason</th><th>No pay</th><th>Allowance suspended</th><th>Certificate</th><th>Warning</th><th>Offence #</th></tr></thead>
              <tbody>
                {dayRecords.map(r => (
                  <tr key={r.id}>
                    <td style={{fontWeight:500}}>{r.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{r.worker_number}</div></td>
                    <td><StatusBadge label={REASON_LABELS[r.reason] || r.reason} tone={toneMap[r.reason] || 'neutral'} /></td>
                    <td>{r.no_work_no_pay ? <StatusBadge label="Yes" tone="danger" /> : <StatusBadge label="No" tone="neutral" />}</td>
                    <td>{r.allowance_suspended ? <StatusBadge label="Suspended" tone="warning" /> : <StatusBadge label="No" tone="neutral" />}</td>
                    <td style={{fontSize:12,color:'var(--teal)'}}>{r.cert_filename ? <span>📎 {r.cert_filename}</span> : <span style={{color:'var(--hint)'}}>—</span>}</td>
                    <td>{r.auto_warning_created ? <StatusBadge label="Auto-created" tone="danger" /> : <StatusBadge label="None" tone="neutral" />}</td>
                    <td style={{fontWeight:600,color: r.offence_number >= 2 ? 'var(--danger)' : r.offence_number === 1 ? 'var(--warning)' : 'var(--hint)'}}>{r.offence_number > 0 ? `#${r.offence_number}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div><h2>Full absence register</h2><p>All logged absences — most recent first</p></div>
          <select className="filter-select" value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
            <option value="all">All workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
          </select>
        </div>
        {listRecords.length === 0 ? (
          <div className="empty-state"><h3>No records</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Worker</th><th>Reason</th><th>No pay</th><th>Cert</th><th>Warning</th><th>Offence</th><th>Notes</th></tr></thead>
              <tbody>
                {listRecords.map(r => (
                  <tr key={r.id}>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(r.date)}</td>
                    <td style={{fontWeight:500}}>{r.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{r.worker_number}</div></td>
                    <td><StatusBadge label={REASON_LABELS[r.reason] || r.reason} tone={toneMap[r.reason] || 'neutral'} /></td>
                    <td>{r.no_work_no_pay ? <StatusBadge label="NWNP" tone="danger" /> : '—'}</td>
                    <td style={{fontSize:12}}>{r.cert_filename ? <span style={{color:'var(--teal)'}}>📎 {r.cert_filename}</span> : <span style={{color:'var(--hint)'}}>—</span>}</td>
                    <td>{r.auto_warning_created ? <StatusBadge label="⚠ Auto" tone="danger" /> : '—'}</td>
                    <td style={{fontWeight:600,color: r.offence_number >= 2 ? 'var(--danger)' : 'var(--hint)'}}>{r.offence_number > 0 ? `#${r.offence_number}` : '—'}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm
          title="Log Absence"
          onClose={() => { setShowDrawer(false); setFormErrors([]) }}
          footer={
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-secondary" onClick={() => { setShowDrawer(false); setFormErrors([]) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Log Absence</button>
            </div>
          }
        >
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && (
              <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>
                {formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}
              </div>
            )}
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Worker *</label>
                <select className="form-select" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})}>
                  <option value="">Select worker</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} />
              </div>
              <div className="form-field span-2">
                <label className="form-label">Reason *</label>
                <select className="form-select" value={form.reason} onChange={e => setForm({...form,reason:e.target.value,cert_filename:null})}>
                  <option value="absent_no_cert">Absent — no certificate</option>
                  <option value="sick_with_cert">Sick — certificate provided</option>
                  <option value="late">Late arrival</option>
                </select>
              </div>
            </div>

            {form.reason === 'sick_with_cert' && (
              <div className="form-field">
                <label className="form-label">Upload sick certificate *</label>
                <input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setForm({...form,cert_filename:e.target.files[0]?.name||null})} />
                {form.cert_filename && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {form.cert_filename}</div>}
              </div>
            )}

            {form.reason === 'absent_no_cert' && (
              <div style={{background:'#fff7ed',border:'1px solid var(--warning)',borderRadius:6,padding:'10px 12px'}}>
                <div style={{fontSize:12,fontWeight:500,color:'var(--warning)',marginBottom:4}}>Auto-actions that will be applied:</div>
                <div style={{fontSize:12,color:'var(--muted)',display:'flex',flexDirection:'column',gap:3}}>
                  <div>✓ No-work-no-pay flag applied</div>
                  <div>✓ Allowance suspended</div>
                  <div>✓ Warning auto-created (open)</div>
                  {form.worker_id && getWorkerOffenceCount(form.worker_id) >= 1 && (
                    <div style={{color:'var(--danger)',fontWeight:500}}>⚠ 2nd+ offence detected — 2-day penalty will be auto-calculated and sent to payroll for HR confirmation</div>
                  )}
                </div>
              </div>
            )}

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} />
            </div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

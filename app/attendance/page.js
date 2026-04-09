'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import {
  getAttendance, addAttendanceRecord, getWorkers,
  getWorkerOffenceCount, addWarning, addPenaltyDeduction, makeId, getWorker,
  getAbsencePercentage, getWeeklyAttendanceGrid, getMonthlyAttendanceSummary, getAttendanceByWorkerSummary
} from '../../lib/mockStore'
import { formatDate, getDailyRate } from '../../lib/utils'

const REASON_LABELS = { sick_with_cert:'Sick — certificate provided', absent_no_cert:'Absent — no certificate', late:'Late arrival' }
const toneMap = { sick_with_cert:'warning', absent_no_cert:'danger', late:'neutral' }

export default function AttendancePage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [view, setView] = useState('daily')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })
  const [monthYear, setMonthYear] = useState('2026-04')
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [filterWorker, setFilterWorker] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const [form, setForm] = useState({ worker_id:'', date:new Date().toISOString().split('T')[0], reason:'absent_no_cert', cert_filename:null, notes:'' })

  useEffect(() => { setRecords(getAttendance()); setWorkers(getWorkers().filter(w => w.active !== false)) }, [])

  const dayRecords = records.filter(r => r.date === selectedDate)
  const absentToday = dayRecords.filter(r => r.reason === 'absent_no_cert').length
  const sickToday = dayRecords.filter(r => r.reason === 'sick_with_cert').length
  const lateToday = dayRecords.filter(r => r.reason === 'late').length
  const penaltiesThisMonth = records.filter(r => r.offence_number >= 2).length
  const absencePct = getAbsencePercentage(selectedDate)

  const handleSubmit = () => {
    const errors = []
    if (!form.worker_id) errors.push('Worker is required')
    if (!form.date) errors.push('Date is required')
    if (!form.reason) errors.push('Reason is required')
    if (form.reason === 'sick_with_cert' && !form.cert_filename) errors.push('Certificate required for sick leave')
    if (errors.length > 0) { setFormErrors(errors); return }
    const worker = getWorker(form.worker_id)
    const offenceCount = getWorkerOffenceCount(form.worker_id)
    const isOffence = form.reason === 'absent_no_cert'
    const newOffenceNumber = isOffence ? offenceCount + 1 : 0
    let autoWarningId = null
    if (form.reason === 'absent_no_cert') {
      autoWarningId = makeId('wm')
      let penaltyAmount = 0, penaltyType = '', warningReason = ''
      if (newOffenceNumber === 1) { warningReason = `1st offence — absent without certificate on ${form.date}.` }
      else { const dailyRate = getDailyRate(worker); penaltyAmount = Math.round(dailyRate*2*100)/100; penaltyType = 'deduction'; warningReason = `${newOffenceNumber}${newOffenceNumber===2?'nd':'th'} offence — absent without certificate on ${form.date}. 2-day penalty applied.` }
      addWarning({ id:autoWarningId, worker_id:form.worker_id, worker_name:worker?.full_name||'', worker_number:worker?.worker_number||'', warning_type:'warning', issue_date:form.date, reason:warningReason, issued_by:'System — Attendance', status:'open', penalty_amount:penaltyAmount||'', penalty_type:penaltyType, notes:`Auto-generated. Offence #${newOffenceNumber}` })
      if (newOffenceNumber >= 2 && penaltyAmount > 0) { addPenaltyDeduction({ id:makeId('pd'), warning_id:autoWarningId, worker_id:form.worker_id, worker_name:worker?.full_name||'', worker_number:worker?.worker_number||'', label:`Attendance penalty — ${newOffenceNumber}${newOffenceNumber===2?'nd':'th'} offence (${form.date})`, amount:penaltyAmount, type:penaltyType, status:'pending_hr_confirmation', created_at:form.date }) }
    }
    addAttendanceRecord({ id:makeId('att'), worker_id:form.worker_id, worker_name:worker?.full_name||'', worker_number:worker?.worker_number||'', date:form.date, reason:form.reason, cert_filename:form.cert_filename, no_work_no_pay:form.reason!=='late', allowance_suspended:form.reason==='absent_no_cert', auto_warning_created:form.reason==='absent_no_cert', auto_warning_id:autoWarningId, offence_number:newOffenceNumber, notes:form.notes })
    setRecords(getAttendance()); setShowDrawer(false); setForm({ worker_id:'', date:new Date().toISOString().split('T')[0], reason:'absent_no_cert', cert_filename:null, notes:'' }); setFormErrors([])
  }

  // Weekly grid data
  const weeklyGrid = getWeeklyAttendanceGrid(weekStart)
  // Monthly summary
  const [mYear, mMonth] = monthYear.split('-').map(Number)
  const monthlySummary = getMonthlyAttendanceSummary(mYear, mMonth)
  // Worker summary
  const workerSummary = selectedWorkerId ? getAttendanceByWorkerSummary(selectedWorkerId) : null

  return (
    <AppShell pageTitle="Attendance">
      <PageHeader eyebrow="Attendance" title="Attendance & absence management"
        description="Log absences, view analytics by day/week/month/worker."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Log Absence</button>} />

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${absentToday>0?'danger':''}`} style={{fontSize:20}}>{absentToday}</div><div className="lbl">Absent today (no cert)</div></div>
        <div className="stat-card"><div className={`num ${sickToday>0?'warning':''}`} style={{fontSize:20}}>{sickToday}</div><div className="lbl">Sick today (cert)</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{lateToday}</div><div className="lbl">Late today</div></div>
        <div className="stat-card"><div className={`num ${absencePct>10?'danger':absencePct>0?'warning':''}`} style={{fontSize:20}}>{absencePct}%</div><div className="lbl">Absence rate</div></div>
      </div>

      {/* View Tabs */}
      <div className="tabs" style={{marginBottom:0}}>
        {[['daily','📅 Daily'],['weekly','📊 Weekly'],['monthly','📈 Monthly'],['worker','👤 By Worker']].map(([key,label]) => (
          <button key={key} className={`tab${view===key?' active':''}`} onClick={() => setView(key)}>{label}</button>
        ))}
      </div>

      {/* DAILY VIEW */}
      {view === 'daily' && (
        <div className="panel" style={{borderTopLeftRadius:0}}>
          <div className="panel-header">
            <div><h2>Day view</h2><p>Absences for selected date</p></div>
            <input type="date" className="form-input" style={{width:160}} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
          {dayRecords.length === 0 ? <div style={{padding:'12px 0',fontSize:13,color:'var(--hint)'}}>No absences logged for {formatDate(selectedDate)}</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Worker</th><th>Reason</th><th>No pay</th><th>Allowance</th><th>Certificate</th><th>Warning</th><th>Offence #</th></tr></thead>
              <tbody>{dayRecords.map(r => (
                <tr key={r.id}>
                  <td style={{fontWeight:500}}>{r.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{r.worker_number}</div></td>
                  <td><StatusBadge label={REASON_LABELS[r.reason]||r.reason} tone={toneMap[r.reason]||'neutral'} /></td>
                  <td>{r.no_work_no_pay ? <StatusBadge label="Yes" tone="danger" /> : <StatusBadge label="No" tone="neutral" />}</td>
                  <td>{r.allowance_suspended ? <StatusBadge label="Suspended" tone="warning" /> : <StatusBadge label="No" tone="neutral" />}</td>
                  <td style={{fontSize:12,color:'var(--teal)'}}>{r.cert_filename ? '📎 '+r.cert_filename : <span style={{color:'var(--hint)'}}>—</span>}</td>
                  <td>{r.auto_warning_created ? <StatusBadge label="Auto" tone="danger" /> : '—'}</td>
                  <td style={{fontWeight:600,color:r.offence_number>=2?'var(--danger)':r.offence_number===1?'var(--warning)':'var(--hint)'}}>{r.offence_number>0?'#'+r.offence_number:'—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {/* WEEKLY VIEW */}
      {view === 'weekly' && (
        <div className="panel" style={{borderTopLeftRadius:0}}>
          <div className="panel-header">
            <div><h2>Weekly grid</h2><p>Absence counts per day</p></div>
            <input type="date" className="form-input" style={{width:160}} value={weekStart} onChange={e => setWeekStart(e.target.value)} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
            {weeklyGrid.map(day => (
              <div key={day.date} style={{background:day.total>0?'#fff1f2':'#f0fdf4',border:'1px solid '+(day.total>0?'#fca5a5':'#86efac'),borderRadius:8,padding:'12px 10px',textAlign:'center',cursor:'pointer'}} onClick={() => { setSelectedDate(day.date); setView('daily') }}>
                <div style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>{day.dayName}</div>
                <div style={{fontSize:10,color:'var(--hint)',marginBottom:6}}>{day.date.slice(5)}</div>
                <div style={{fontSize:24,fontWeight:800,color:day.total>0?'#dc2626':'#16a34a'}}>{day.total}</div>
                {day.total > 0 && <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>
                  {day.absent>0 && <span style={{color:'#dc2626'}}>{day.absent} absent </span>}
                  {day.sick>0 && <span style={{color:'#d97706'}}>{day.sick} sick </span>}
                  {day.late>0 && <span>{day.late} late</span>}
                </div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MONTHLY VIEW */}
      {view === 'monthly' && (
        <div className="panel" style={{borderTopLeftRadius:0}}>
          <div className="panel-header">
            <div><h2>Monthly summary</h2><p>Absence totals by worker for the month</p></div>
            <input type="month" className="form-input" style={{width:160}} value={monthYear} onChange={e => setMonthYear(e.target.value)} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            <div className="stat-card"><div className="num" style={{fontSize:18}}>{monthlySummary.totalRecords}</div><div className="lbl">Total records</div></div>
            <div className="stat-card"><div className="num danger" style={{fontSize:18}}>{monthlySummary.byWorker.reduce((s,w)=>s+w.absent,0)}</div><div className="lbl">Absent (no cert)</div></div>
            <div className="stat-card"><div className="num warning" style={{fontSize:18}}>{monthlySummary.byWorker.reduce((s,w)=>s+w.sick,0)}</div><div className="lbl">Sick (cert)</div></div>
            <div className="stat-card"><div className="num" style={{fontSize:18}}>{monthlySummary.byWorker.reduce((s,w)=>s+w.late,0)}</div><div className="lbl">Late</div></div>
          </div>
          {monthlySummary.byWorker.length === 0 ? <div style={{fontSize:13,color:'var(--hint)',padding:'16px 0'}}>No attendance records for this month.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Worker</th><th>Total</th><th>Absent</th><th>Sick</th><th>Late</th></tr></thead>
              <tbody>{monthlySummary.byWorker.map(w => (
                <tr key={w.worker_id} style={{cursor:'pointer'}} onClick={() => { setSelectedWorkerId(w.worker_id); setView('worker') }}>
                  <td style={{fontWeight:500}}>{w.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{w.worker_number}</div></td>
                  <td style={{fontWeight:600}}>{w.total}</td>
                  <td style={{color:w.absent>0?'var(--danger)':'var(--hint)',fontWeight:w.absent>0?600:400}}>{w.absent}</td>
                  <td style={{color:w.sick>0?'var(--warning)':'var(--hint)'}}>{w.sick}</td>
                  <td style={{color:'var(--hint)'}}>{w.late}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {/* WORKER VIEW */}
      {view === 'worker' && (
        <div className="panel" style={{borderTopLeftRadius:0}}>
          <div className="panel-header">
            <div><h2>Worker attendance</h2><p>Full absence history for a worker</p></div>
            <select className="filter-select" value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)}>
              <option value="">Select worker</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}
            </select>
          </div>
          {!selectedWorkerId ? <div style={{fontSize:13,color:'var(--hint)',padding:'24px 0',textAlign:'center'}}>Select a worker to view their attendance history.</div> : (() => {
            const ws = workerSummary
            return (<>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
                <div className="stat-card"><div className="num" style={{fontSize:18}}>{ws.total}</div><div className="lbl">Total records</div></div>
                <div className="stat-card"><div className="num danger" style={{fontSize:18}}>{ws.absent}</div><div className="lbl">Absent</div></div>
                <div className="stat-card"><div className="num warning" style={{fontSize:18}}>{ws.sick}</div><div className="lbl">Sick</div></div>
                <div className="stat-card"><div className="num" style={{fontSize:18}}>{ws.late}</div><div className="lbl">Late</div></div>
                <div className="stat-card"><div className="num danger" style={{fontSize:18}}>{ws.penalties}</div><div className="lbl">Penalties</div></div>
              </div>
              {ws.records.length === 0 ? <div style={{fontSize:13,color:'var(--hint)',padding:'16px 0'}}>No records for this worker.</div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Date</th><th>Reason</th><th>No pay</th><th>Warning</th><th>Offence</th><th>Notes</th></tr></thead>
                  <tbody>{ws.records.map(r => (
                    <tr key={r.id}>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(r.date)}</td>
                      <td><StatusBadge label={REASON_LABELS[r.reason]||r.reason} tone={toneMap[r.reason]||'neutral'} /></td>
                      <td>{r.no_work_no_pay ? <StatusBadge label="NWNP" tone="danger" /> : '—'}</td>
                      <td>{r.auto_warning_created ? <StatusBadge label="Auto" tone="danger" /> : '—'}</td>
                      <td style={{fontWeight:600,color:r.offence_number>=2?'var(--danger)':'var(--hint)'}}>{r.offence_number>0?'#'+r.offence_number:'—'}</td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{r.notes}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </>)
          })()}
        </div>
      )}

      {/* Full register (below any view) */}
      <div className="panel">
        <div className="panel-header">
          <div><h2>Full absence register</h2><p>All logged absences — most recent first</p></div>
          <select className="filter-select" value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
            <option value="all">All workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
          </select>
        </div>
        {(() => { const listRecords = filterWorker === 'all' ? records : records.filter(r => r.worker_id === filterWorker); return listRecords.length === 0 ? <div className="empty-state"><h3>No records</h3></div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Worker</th><th>Reason</th><th>No pay</th><th>Cert</th><th>Warning</th><th>Offence</th><th>Notes</th></tr></thead>
            <tbody>{listRecords.map(r => (
              <tr key={r.id}>
                <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(r.date)}</td>
                <td style={{fontWeight:500}}>{r.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{r.worker_number}</div></td>
                <td><StatusBadge label={REASON_LABELS[r.reason]||r.reason} tone={toneMap[r.reason]||'neutral'} /></td>
                <td>{r.no_work_no_pay ? <StatusBadge label="NWNP" tone="danger" /> : '—'}</td>
                <td style={{fontSize:12}}>{r.cert_filename ? <span style={{color:'var(--teal)'}}>📎 {r.cert_filename}</span> : <span style={{color:'var(--hint)'}}>—</span>}</td>
                <td>{r.auto_warning_created ? <StatusBadge label="⚠ Auto" tone="danger" /> : '—'}</td>
                <td style={{fontWeight:600,color:r.offence_number>=2?'var(--danger)':'var(--hint)'}}>{r.offence_number>0?'#'+r.offence_number:'—'}</td>
                <td style={{fontSize:12,color:'var(--muted)'}}>{r.notes}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )})()}
      </div>

      {/* Log Absence Drawer */}
      {showDrawer && (
        <DrawerForm title="Log Absence" onClose={() => { setShowDrawer(false); setFormErrors([]) }}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => { setShowDrawer(false); setFormErrors([]) }}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Log Absence</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Worker *</label><select className="form-select" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}</select></div>
              <div className="form-field"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} /></div>
              <div className="form-field span-2"><label className="form-label">Reason *</label><select className="form-select" value={form.reason} onChange={e => setForm({...form,reason:e.target.value,cert_filename:null})}><option value="absent_no_cert">Absent — no certificate</option><option value="sick_with_cert">Sick — certificate provided</option><option value="late">Late arrival</option></select></div>
            </div>
            {form.reason === 'sick_with_cert' && <div className="form-field"><label className="form-label">Upload sick certificate *</label><input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setForm({...form,cert_filename:e.target.files[0]?.name||null})} />{form.cert_filename && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {form.cert_filename}</div>}</div>}
            {form.reason === 'absent_no_cert' && <div style={{background:'#fff7ed',border:'1px solid var(--warning)',borderRadius:6,padding:'10px 12px'}}><div style={{fontSize:12,fontWeight:500,color:'var(--warning)',marginBottom:4}}>Auto-actions:</div><div style={{fontSize:12,color:'var(--muted)',display:'flex',flexDirection:'column',gap:3}}><div>✓ No-work-no-pay applied</div><div>✓ Allowance suspended</div><div>✓ Warning auto-created</div>{form.worker_id && getWorkerOffenceCount(form.worker_id) >= 1 && <div style={{color:'var(--danger)',fontWeight:500}}>⚠ 2nd+ offence — 2-day penalty auto-calculated</div>}</div></div>}
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

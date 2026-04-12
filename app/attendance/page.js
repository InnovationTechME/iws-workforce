'use client'
import { useState, useEffect, useCallback } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import {
  getVisibleWorkers,
  getWorkerOffenceCount, addWarning, addPenaltyDeduction, makeId, getWorker,
  getAbsencePercentage, getWeeklyAttendanceGrid, getMonthlyAttendanceSummary, getAttendanceByWorkerSummary,
  calculateNWNPDeduction, checkWeekendExtensionRule, checkHolidayExtensionRule, checkMonthlyPenaltyCap,
  createAttendanceConflict, getPendingConflicts, submitHRClarification, approveConflictResolution,
  getPendingCarryOverNotes, resolveCarryOverNote
} from '../../lib/mockStore'
import { getAllAttendance, addAttendanceRecord, getAttendanceConflicts, getCarryOverNotes } from '../../lib/attendanceService'
import { formatDate, getDailyRate } from '../../lib/utils'

const REASON_LABELS = { sick_with_cert:'Sick — certificate provided', absent_no_cert:'Absent — no certificate', late:'Late arrival' }
const toneMap = { sick_with_cert:'warning', absent_no_cert:'danger', late:'neutral' }
const CONFLICT_TYPE_LABELS = { weekend_extension:'Weekend Extension', holiday_extension:'Holiday Extension', flat_rate:'Flat Rate Penalty' }
const CONFLICT_STATUS_TONES = { pending:'warning', hr_clarified:'info', resolved:'success', auto_resolved:'neutral' }

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
  const [form, setForm] = useState({ worker_id:'', date:new Date().toISOString().split('T')[0], reason:'absent_no_cert', cert_filename:null, notes:'', verification_status:'', verification_notes:'' })
  const [lastSubmitResult, setLastSubmitResult] = useState(null)

  // Conflicts tab state
  const [conflictFilter, setConflictFilter] = useState('all')
  const [conflictSearch, setConflictSearch] = useState('')
  const [selectedConflict, setSelectedConflict] = useState(null)
  const [clarificationText, setClarificationText] = useState('')
  const [clarificationResolution, setClarificationResolution] = useState('confirmed_default')
  const [conflicts, setConflicts] = useState([])
  const [carryOverNotes, setCarryOverNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [att, confs, notes] = await Promise.all([
          getAllAttendance(),
          getAttendanceConflicts(),
          getCarryOverNotes()
        ])
        if (!cancelled) {
          setRecords(att || [])
          setConflicts(confs || [])
          setCarryOverNotes(notes || [])
          setWorkers(getVisibleWorkers().filter(w => w.active !== false))
        }
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load attendance')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const refreshConflicts = useCallback(async () => {
    const confs = await getAttendanceConflicts()
    setConflicts(confs || [])
    setCarryOverNotes(getPendingCarryOverNotes())
  }, [])

  // Auto-dismiss submit result banner after 5 seconds
  useEffect(() => {
    if (lastSubmitResult) {
      const timer = setTimeout(() => setLastSubmitResult(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [lastSubmitResult])

  const dayRecords = records.filter(r => r.date === selectedDate)
  const absentToday = dayRecords.filter(r => r.reason === 'absent_no_cert').length
  const sickToday = dayRecords.filter(r => r.reason === 'sick_with_cert').length
  const lateToday = dayRecords.filter(r => r.reason === 'late').length
  const penaltiesThisMonth = records.filter(r => r.offence_number >= 2).length
  const absencePct = getAbsencePercentage(selectedDate)

  const handleSubmit = async () => {
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
    const record = { id:makeId('att'), worker_id:form.worker_id, worker_name:worker?.full_name||'', worker_number:worker?.worker_number||'', date:form.date, reason:form.reason, cert_filename:form.cert_filename, cert_verification_status:form.verification_status||null, cert_verification_notes:form.verification_notes||null, no_work_no_pay:form.reason!=='late', allowance_suspended:form.reason==='absent_no_cert', auto_warning_created:form.reason==='absent_no_cert', auto_warning_id:autoWarningId, offence_number:newOffenceNumber, notes:form.notes }
    await addAttendanceRecord(record)

    // NWNP conflict logic
    let conflictCreated = false
    const deduction = calculateNWNPDeduction(worker, form.date)
    if (deduction) {
      const isMonthly = worker.category === 'Permanent Staff' || worker.category === 'Office Staff'
      const isFlat = worker.category === 'Contract Worker' || worker.category === 'Subcontract Worker'

      if (isMonthly) {
        const weekendResult = checkWeekendExtensionRule(form.date)
        const holidayResult = checkHolidayExtensionRule(form.date)

        if (weekendResult.extended) {
          const totalDeduction = deduction.total_per_day * (1 + weekendResult.extra_days.length)
          const conflict = createAttendanceConflict(record, 'weekend_extension', totalDeduction)
          addPenaltyDeduction({ id:makeId('pd'), warning_id:autoWarningId, worker_id:form.worker_id, worker_name:worker?.full_name||'', worker_number:worker?.worker_number||'', label:`NWNP weekend extension — ${form.date}`, amount:totalDeduction, type:'deduction', status:'pending_hr_confirmation', created_at:form.date, conflict_id:conflict.id })
          conflictCreated = true
        } else if (holidayResult.extended) {
          const totalDeduction = deduction.total_per_day * (1 + holidayResult.extra_days.length)
          const conflict = createAttendanceConflict(record, 'holiday_extension', totalDeduction)
          addPenaltyDeduction({ id:makeId('pd'), warning_id:autoWarningId, worker_id:form.worker_id, worker_name:worker?.full_name||'', worker_number:worker?.worker_number||'', label:`NWNP holiday extension — ${form.date}`, amount:totalDeduction, type:'deduction', status:'pending_hr_confirmation', created_at:form.date, conflict_id:conflict.id })
          conflictCreated = true
        }
      }

      if (isFlat) {
        const [cYear, cMonth] = form.date.split('-').map(Number)
        const capResult = checkMonthlyPenaltyCap(form.worker_id, cMonth, cYear, deduction.total_per_day)
        if (capResult.capped) {
          setLastSubmitResult({ type:'warning', message:capResult.warning_message })
        }
      }
    }

    if (conflictCreated) {
      setLastSubmitResult({ type:'conflict', message:'Weekend/Holiday extension rule applied — conflict created for HR review' })
    } else if (!lastSubmitResult) {
      setLastSubmitResult({ type:'success', message:'Absence logged successfully' })
    }

    setRecords(await getAllAttendance())
    await refreshConflicts()
    setShowDrawer(false)
    setForm({ worker_id:'', date:new Date().toISOString().split('T')[0], reason:'absent_no_cert', cert_filename:null, notes:'', verification_status:'', verification_notes:'' })
    setFormErrors([])
  }

  // Weekly grid data
  const weeklyGrid = getWeeklyAttendanceGrid(weekStart)
  // Monthly summary
  const [mYear, mMonth] = monthYear.split('-').map(Number)
  const monthlySummary = getMonthlyAttendanceSummary(mYear, mMonth)
  // Worker summary
  const workerSummary = selectedWorkerId ? getAttendanceByWorkerSummary(selectedWorkerId) : null

  // Filtered conflicts
  const filteredConflicts = conflicts.filter(c => {
    if (conflictFilter !== 'all' && c.status !== conflictFilter) return false
    if (conflictSearch && !c.worker_name.toLowerCase().includes(conflictSearch.toLowerCase())) return false
    return true
  })

  const getDaysUntilAutoResolve = (conflict) => {
    if (conflict.status === 'resolved' || conflict.status === 'auto_resolved') return null
    const now = new Date()
    const autoDate = new Date(conflict.auto_resolve_date)
    const diff = Math.ceil((autoDate - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const handleSubmitClarification = async () => {
    if (!selectedConflict || !clarificationText.trim()) return
    const resolutionMap = {
      confirmed_default: 'Confirm default deduction (full amount)',
      reduced: 'Reduce to base NWNP only (remove extension)',
      waived: 'Waive entirely — authorised absence'
    }
    submitHRClarification(selectedConflict.id, { text: clarificationText, recommendation: clarificationResolution, recommendation_label: resolutionMap[clarificationResolution] }, 'HR Manager')
    await refreshConflicts()
    const updated = (await getAttendanceConflicts()).find(c => c.id === selectedConflict.id)
    setSelectedConflict(updated || null)
    setClarificationText('')
    setClarificationResolution('confirmed_default')
  }

  const handleApproveResolution = async (resolution) => {
    if (!selectedConflict) return
    let finalDeduction = selectedConflict.default_deduction
    if (resolution === 'waived') {
      finalDeduction = 0
    } else if (resolution === 'reduced') {
      const extensionDays = selectedConflict.conflict_type === 'weekend_extension' ? 1 : 1
      finalDeduction = selectedConflict.default_deduction / (1 + extensionDays)
    }
    approveConflictResolution(selectedConflict.id, 'Operations Manager', resolution, finalDeduction)
    await refreshConflicts()
    const updated = (await getAttendanceConflicts()).find(c => c.id === selectedConflict.id)
    setSelectedConflict(updated || null)
  }

  const handleResolveCarryOver = (noteId) => {
    resolveCarryOverNote(noteId, 'Operations Manager')
    setCarryOverNotes(getPendingCarryOverNotes())
  }

  return (
    <AppShell pageTitle="Attendance">
      <PageHeader eyebrow="Attendance" title="Attendance & absence management"
        description="Log absences, view analytics by day/week/month/worker."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Log Absence</button>} />

      {/* Submit result banner */}
      {lastSubmitResult && (
        <div onClick={() => setLastSubmitResult(null)} style={{padding:'10px 16px',marginBottom:12,borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,background:lastSubmitResult.type==='conflict'?'#fef9c3':lastSubmitResult.type==='warning'?'#fef9c3':'#dcfce7',border:'1px solid '+(lastSubmitResult.type==='conflict'?'#facc15':lastSubmitResult.type==='warning'?'#facc15':'#86efac'),color:lastSubmitResult.type==='conflict'?'#854d0e':lastSubmitResult.type==='warning'?'#854d0e':'#166534'}}>
          {lastSubmitResult.type === 'conflict' && '\u26A0 '}{lastSubmitResult.message}
        </div>
      )}

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${absentToday>0?'danger':''}`} style={{fontSize:20}}>{absentToday}</div><div className="lbl">Absent today (no cert)</div></div>
        <div className="stat-card"><div className={`num ${sickToday>0?'warning':''}`} style={{fontSize:20}}>{sickToday}</div><div className="lbl">Sick today (cert)</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{lateToday}</div><div className="lbl">Late today</div></div>
        <div className="stat-card"><div className={`num ${absencePct>10?'danger':absencePct>0?'warning':''}`} style={{fontSize:20}}>{absencePct}%</div><div className="lbl">Absence rate</div></div>
      </div>

      {/* View Tabs */}
      <div className="tabs" style={{marginBottom:0}}>
        {[['daily','\uD83D\uDCC5 Daily'],['weekly','\uD83D\uDCCA Weekly'],['monthly','\uD83D\uDCC8 Monthly'],['worker','\uD83D\uDC64 By Worker'],['conflicts','\u26A0 Conflicts']].map(([key,label]) => (
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
                  <td style={{fontSize:12,color:'var(--teal)'}}>{r.cert_filename ? '\uD83D\uDCCE '+r.cert_filename : <span style={{color:'var(--hint)'}}>—</span>}</td>
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

      {/* CONFLICTS VIEW */}
      {view === 'conflicts' && (
        <div className="panel" style={{borderTopLeftRadius:0}}>
          <div className="panel-header">
            <div><h2>Attendance Conflicts</h2><p>NWNP deduction conflicts requiring HR/Ops review</p></div>
          </div>

          {/* Filter buttons */}
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            {[['all','All'],['pending','Pending'],['hr_clarified','HR Clarified'],['resolved','Resolved'],['auto_resolved','Auto-Resolved']].map(([key,label]) => (
              <button key={key} onClick={() => setConflictFilter(key)} style={{padding:'6px 14px',borderRadius:6,border:'1px solid '+(conflictFilter===key?'var(--navy)':'#d1d5db'),background:conflictFilter===key?'var(--navy)':'#fff',color:conflictFilter===key?'#fff':'var(--muted)',fontSize:12,fontWeight:500,cursor:'pointer'}}>{label}</button>
            ))}
            <input type="text" placeholder="Search worker name..." value={conflictSearch} onChange={e => setConflictSearch(e.target.value)} style={{marginLeft:'auto',padding:'6px 12px',borderRadius:6,border:'1px solid #d1d5db',fontSize:12,width:200}} />
          </div>

          {filteredConflicts.length === 0 ? (
            <div style={{padding:'24px 0',textAlign:'center',fontSize:13,color:'var(--hint)'}}>No conflicts found{conflictFilter !== 'all' ? ` with status "${conflictFilter}"` : ''}.</div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Worker</th><th>Date</th><th>Type</th><th>Default Deduction</th><th>Status</th><th>Days Until Auto-Resolve</th><th>Actions</th></tr></thead>
              <tbody>{filteredConflicts.map(c => {
                const daysLeft = getDaysUntilAutoResolve(c)
                return (
                  <tr key={c.id} style={{cursor:'pointer'}} onClick={() => { setSelectedConflict(c); setClarificationText(''); setClarificationResolution('confirmed_default') }}>
                    <td style={{fontWeight:500}}>{c.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{c.worker_number}</div></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(c.absent_date)}</td>
                    <td><StatusBadge label={CONFLICT_TYPE_LABELS[c.conflict_type]||c.conflict_type} tone="warning" /></td>
                    <td style={{fontWeight:600}}>AED {c.default_deduction?.toFixed(2)}</td>
                    <td><StatusBadge label={c.status.replace(/_/g,' ')} tone={CONFLICT_STATUS_TONES[c.status]||'neutral'} /></td>
                    <td style={{textAlign:'center',fontWeight:600,color:daysLeft !== null && daysLeft <= 1 ?'var(--danger)':daysLeft !== null && daysLeft <= 3 ?'var(--warning)':'var(--hint)'}}>{daysLeft !== null ? daysLeft + 'd' : '—'}</td>
                    <td><button className="btn btn-secondary" style={{fontSize:11,padding:'4px 10px'}} onClick={e => { e.stopPropagation(); setSelectedConflict(c); setClarificationText(''); setClarificationResolution('confirmed_default') }}>View</button></td>
                  </tr>
                )
              })}</tbody>
            </table></div>
          )}

          {/* Carry-Over Notes */}
          {carryOverNotes.length > 0 && (
            <div style={{marginTop:24,background:'#fffbeb',border:'1px solid #fbbf24',borderRadius:8,padding:16}}>
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12,color:'#92400e'}}>
                {'\uD83D\uDCCB'} Carry-Over Notes — Items from previous months
              </h3>
              {carryOverNotes.map(note => (
                <div key={note.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#fff',borderRadius:6,border:'1px solid #fde68a',marginBottom:8}}>
                  <div>
                    <span style={{fontWeight:500,fontSize:13}}>{note.worker_name}</span>
                    <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{note.note}</div>
                    <div style={{fontSize:11,color:'var(--hint)',marginTop:2}}>{note.month} {note.year}</div>
                  </div>
                  <button className="btn btn-secondary" style={{fontSize:11,padding:'4px 10px',whiteSpace:'nowrap'}} onClick={() => handleResolveCarryOver(note.id)}>Mark Resolved</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflict Detail Drawer */}
      {selectedConflict && (
        <div style={{position:'fixed',right:0,top:0,bottom:0,width:480,background:'#fff',boxShadow:'-4px 0 20px rgba(0,0,0,0.1)',zIndex:100,overflowY:'auto',padding:24}}>
          {/* Close button */}
          <button onClick={() => setSelectedConflict(null)} style={{position:'absolute',top:12,right:12,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--muted)',lineHeight:1}}>{'\u2715'}</button>

          {/* Section 1 — Details */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:2}}>{selectedConflict.worker_name}</div>
            <div style={{fontSize:12,color:'var(--hint)',marginBottom:12}}>{selectedConflict.worker_number}</div>

            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <StatusBadge label={CONFLICT_TYPE_LABELS[selectedConflict.conflict_type]||selectedConflict.conflict_type} tone="warning" />
              <StatusBadge label={selectedConflict.status.replace(/_/g,' ')} tone={CONFLICT_STATUS_TONES[selectedConflict.status]||'neutral'} />
            </div>

            <div style={{fontSize:12,color:'#92400e',marginBottom:12}}>
              Created {formatDate(selectedConflict.created_at?.split('T')[0])} — Auto-resolves {formatDate(selectedConflict.auto_resolve_date?.split('T')[0])}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13,marginBottom:12}}>
              <div><span style={{color:'var(--hint)'}}>Absent date:</span> <span style={{fontWeight:500}}>{formatDate(selectedConflict.absent_date)}</span></div>
              <div><span style={{color:'var(--hint)'}}>Day:</span> <span style={{fontWeight:500}}>{new Date(selectedConflict.absent_date).toLocaleDateString('en-GB',{weekday:'long'})}</span></div>
            </div>

            <div style={{fontSize:13,marginBottom:8}}><span style={{color:'var(--hint)'}}>Default deduction:</span> <span style={{fontWeight:700,color:'var(--danger)'}}>AED {selectedConflict.default_deduction?.toFixed(2)}</span></div>

            <div style={{fontSize:12,color:'var(--muted)',background:'#f9fafb',borderRadius:6,padding:'8px 12px',marginBottom:8}}>{selectedConflict.description}</div>

            {(() => {
              const daysLeft = getDaysUntilAutoResolve(selectedConflict)
              if (daysLeft === null) return null
              return <div style={{fontSize:12,fontWeight:600,color:daysLeft<=1?'var(--danger)':daysLeft<=3?'var(--warning)':'var(--hint)'}}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} until auto-resolution</div>
            })()}
          </div>

          {/* Section 2 — HR Clarification (pending only) */}
          {selectedConflict.status === 'pending' && (
            <div style={{borderTop:'1px solid #e5e7eb',paddingTop:16,marginBottom:24}}>
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12}}>HR Clarification</h3>
              <textarea value={clarificationText} onChange={e => setClarificationText(e.target.value)} placeholder="Enter clarification notes..." rows={3} style={{width:'100%',padding:'8px 12px',borderRadius:6,border:'1px solid #d1d5db',fontSize:13,resize:'vertical',marginBottom:8,boxSizing:'border-box'}} />
              <select value={clarificationResolution} onChange={e => setClarificationResolution(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:6,border:'1px solid #d1d5db',fontSize:13,marginBottom:12,boxSizing:'border-box'}}>
                <option value="confirmed_default">Confirm default deduction (full amount)</option>
                <option value="reduced">Reduce to base NWNP only (remove extension)</option>
                <option value="waived">Waive entirely — authorised absence</option>
              </select>
              <button className="btn btn-primary" style={{width:'100%'}} onClick={handleSubmitClarification} disabled={!clarificationText.trim()}>Submit Clarification</button>
            </div>
          )}

          {/* HR Clarification info box (when already clarified) */}
          {selectedConflict.status === 'hr_clarified' && selectedConflict.hr_clarification && (
            <div style={{borderTop:'1px solid #e5e7eb',paddingTop:16,marginBottom:24}}>
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12}}>HR Clarification</h3>
              <div style={{background:'#eff6ff',border:'1px solid #93c5fd',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#1e40af',marginBottom:4}}>HR Notes ({selectedConflict.hr_clarified_by})</div>
                <div style={{fontSize:13,color:'#1e3a5f'}}>{selectedConflict.hr_clarification.text || selectedConflict.hr_clarification}</div>
                {selectedConflict.hr_clarification.recommendation_label && (
                  <div style={{fontSize:12,color:'#1e40af',marginTop:8,fontWeight:500}}>Recommendation: {selectedConflict.hr_clarification.recommendation_label}</div>
                )}
              </div>
            </div>
          )}

          {/* Section 3 — Operations Approval (hr_clarified only) */}
          {selectedConflict.status === 'hr_clarified' && (
            <div style={{borderTop:'1px solid #e5e7eb',paddingTop:16,marginBottom:24}}>
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12}}>Operations Approval</h3>
              {selectedConflict.hr_clarification && (
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>
                  <div style={{fontWeight:500}}>HR recommends: {selectedConflict.hr_clarification.recommendation_label || 'Confirm default'}</div>
                </div>
              )}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button className="btn btn-primary" style={{width:'100%'}} onClick={() => handleApproveResolution(selectedConflict.hr_clarification?.recommendation || 'confirmed_default')}>
                  Approve Resolution
                </button>
                {selectedConflict.hr_clarification?.recommendation !== 'confirmed_default' && (
                  <button className="btn btn-secondary" style={{width:'100%',fontSize:12}} onClick={() => handleApproveResolution('confirmed_default')}>
                    Override — Apply Full Default Deduction
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 4 — Resolution Summary */}
          {(selectedConflict.status === 'resolved' || selectedConflict.status === 'auto_resolved') && (
            <div style={{borderTop:'1px solid #e5e7eb',paddingTop:16}}>
              <h3 style={{fontSize:14,fontWeight:600,marginBottom:12}}>Resolution Summary</h3>

              <div style={{fontSize:12,color:'var(--muted)',display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
                {selectedConflict.hr_clarified_by && <div>HR clarification by: <span style={{fontWeight:500}}>{selectedConflict.hr_clarified_by}</span> on {formatDate(selectedConflict.hr_clarified_at?.split('T')[0])}</div>}
                {selectedConflict.ops_approved_by && <div>Approved by: <span style={{fontWeight:500}}>{selectedConflict.ops_approved_by}</span> on {formatDate(selectedConflict.ops_approved_at?.split('T')[0])}</div>}
                <div>Resolution: <span style={{fontWeight:500}}>{selectedConflict.resolution?.replace(/_/g,' ') || '—'}</span></div>
              </div>

              <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>
                Final deduction: AED {(selectedConflict.final_deduction ?? selectedConflict.default_deduction)?.toFixed(2)}
              </div>

              {selectedConflict.status === 'resolved' ? (
                <div style={{background:'#dcfce7',border:'1px solid #86efac',borderRadius:8,padding:'12px 16px',textAlign:'center',fontWeight:600,color:'#166534',fontSize:13}}>
                  {'\u2713'} Resolved
                </div>
              ) : (
                <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:8,padding:'12px 16px',textAlign:'center',fontWeight:600,color:'#92400e',fontSize:13}}>
                  Auto-resolved — default deduction waived
                  {selectedConflict.auto_resolve_note && <div style={{fontSize:11,fontWeight:400,marginTop:4}}>{selectedConflict.auto_resolve_note}</div>}
                </div>
              )}
            </div>
          )}
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
                <td style={{fontSize:12}}>{r.cert_filename ? <span style={{color:'var(--teal)'}}>{'\uD83D\uDCCE'} {r.cert_filename}</span> : <span style={{color:'var(--hint)'}}>—</span>}</td>
                <td>{r.auto_warning_created ? <StatusBadge label={'\u26A0 Auto'} tone="danger" /> : '—'}</td>
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
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>{'\u26A0'} {e}</div>)}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Worker *</label><select className="form-select" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}</select></div>
              <div className="form-field"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} /></div>
              <div className="form-field span-2"><label className="form-label">Reason *</label><select className="form-select" value={form.reason} onChange={e => setForm({...form,reason:e.target.value,cert_filename:null})}><option value="absent_no_cert">Absent — no certificate</option><option value="sick_with_cert">Sick — certificate provided</option><option value="late">Late arrival</option></select></div>
            </div>
            {form.reason === 'sick_with_cert' && <>
              <div className="form-field"><label className="form-label">Upload sick certificate *</label><input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setForm({...form,cert_filename:e.target.files[0]?.name||null})} />{form.cert_filename && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {form.cert_filename}</div>}</div>
              {form.cert_filename && (<div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'14px 16px',marginTop:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:10,textTransform:'uppercase',letterSpacing:0.5}}>Certificate Verification</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr',gap:8,marginBottom:12}}>
                  <div>
                    <a href="https://www.tamm.abudhabi/wb/doh/sick-leave-validation" target="_blank" rel="noopener noreferrer" style={{display:'inline-block',padding:'8px 12px',background:'#0d9488',color:'white',borderRadius:6,textDecoration:'none',fontSize:12,fontWeight:600}}>↗ Verify on TAMM (Abu Dhabi)</a>
                    <div style={{fontSize:10,color:'#64748b',marginTop:3}}>Enter reference number + Emirates ID from certificate</div>
                  </div>
                  <div>
                    <a href="https://services.dha.gov.ae/sheryan/wps/portal/home/services-professional/online-verification" target="_blank" rel="noopener noreferrer" style={{display:'inline-block',padding:'8px 12px',background:'#1d4ed8',color:'white',borderRadius:6,textDecoration:'none',fontSize:12,fontWeight:600}}>↗ Verify on Sheryan (Dubai)</a>
                    <div style={{fontSize:10,color:'#64748b',marginTop:3}}>Enter barcode + PIN from certificate</div>
                  </div>
                  <div>
                    <a href="https://mohap.gov.ae/en/services/attestation-of-medical-leaves-and-reports" target="_blank" rel="noopener noreferrer" style={{display:'inline-block',padding:'8px 12px',background:'#475569',color:'white',borderRadius:6,textDecoration:'none',fontSize:12,fontWeight:600}}>↗ Verify on MOHAP (Other Emirates)</a>
                    <div style={{fontSize:10,color:'#64748b',marginTop:3}}>For Sharjah, Ajman, RAK, Fujairah, UAQ</div>
                  </div>
                </div>
                <div style={{borderTop:'1px solid #e2e8f0',paddingTop:10,marginTop:6}}>
                  <label className="form-label" style={{fontSize:11}}>Verification result</label>
                  <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                    {[
                      ['verified','Verified — certificate confirmed authentic','#0d9488','#f0fdfa'],
                      ['unable','Unable to verify — certificate not found in system','#d97706','#fffbeb'],
                      ['rejected','Certificate rejected — not from licensed facility','#dc2626','#fef2f2']
                    ].map(([val,label,col,bg]) => (
                      <label key={val} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',border:`1px solid ${form.verification_status===val?col:'#e2e8f0'}`,borderRadius:6,background:form.verification_status===val?bg:'white',cursor:'pointer'}}>
                        <input type="radio" name="verification" value={val} checked={form.verification_status===val} onChange={() => setForm({...form,verification_status:val})} style={{accentColor:col}} />
                        <span style={{fontSize:12,color:form.verification_status===val?col:'#0f172a',fontWeight:form.verification_status===val?600:400}}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-field" style={{marginTop:10}}>
                  <label className="form-label" style={{fontSize:11}}>Verification notes *</label>
                  <textarea className="form-textarea" rows={2} placeholder="e.g. Verified on TAMM — ref A-2026-12345 matches worker Emirates ID 784-XXXX — 2 days confirmed" value={form.verification_notes} onChange={e => setForm({...form,verification_notes:e.target.value})} style={{fontSize:12}} />
                </div>
                <div style={{background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'8px 12px',marginTop:10,fontSize:11,color:'#475569',lineHeight:1.5}}>
                  ℹ A sick leave certificate must be verified before the absence is treated as approved sick leave. Unverified certificates are held as pending. If verification fails, the absence is reclassified as unauthorised absence and NWNP deductions apply automatically.
                </div>
              </div>)}
            </>}
            {form.reason === 'absent_no_cert' && <div style={{background:'#fff7ed',border:'1px solid var(--warning)',borderRadius:6,padding:'10px 12px'}}><div style={{fontSize:12,fontWeight:500,color:'var(--warning)',marginBottom:4}}>Auto-actions:</div><div style={{fontSize:12,color:'var(--muted)',display:'flex',flexDirection:'column',gap:3}}><div>{'\u2713'} No-work-no-pay applied</div><div>{'\u2713'} Allowance suspended</div><div>{'\u2713'} Warning auto-created</div>{form.worker_id && getWorkerOffenceCount(form.worker_id) >= 1 && <div style={{color:'var(--danger)',fontWeight:500}}>{'\u26A0'} 2nd+ offence — 2-day penalty auto-calculated</div>}</div></div>}
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

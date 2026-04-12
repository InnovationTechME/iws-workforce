'use client'
import React, { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import LetterViewer from '../../components/LetterViewer'
import { getAllPayrollBatches, getPayrollBatchByMonth, getPayrollLinesByBatch, canEditPayrollBatch, unlockPayrollBatch, addCorrectionNote, getPayrollBatch, getPayrollLines, updatePayrollBatch, addPayrollAdjustment, getPenaltyDeductions, confirmPenaltyDeduction, removePenaltyDeduction, getRamadanMode, getVisibleWorkers, getTimesheetHeaders, getTimesheetLines, getAllTimesheetLines, updateTimesheetLine, isPublicHoliday, getPublicHolidays, calculateLeaveBalance, getWorker, getPayrollHistoryByYear, getPayrollYearSummary, getRetentionStatus, getPendingConflicts, getPendingCarryOverNotes, autoResolveExpiredConflicts, resolveCarryOverNote } from '../../lib/mockStore'
import { formatCurrency, getStatusTone } from '../../lib/utils'
import { canAccess, getRole } from '../../lib/mockAuth'
import { payslipHTML } from '../../lib/letterTemplates'

export default function PayrollPage() {
  const [allBatches, setAllBatches] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [batch, setBatch] = useState(null)
  const [lines, setLines] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('all')
  const [adjForm, setAdjForm] = useState({ type:'allowance', label:'', amount:'' })
  const [penalties, setPenalties] = useState([])
  const [officeStaff, setOfficeStaff] = useState([])
  const [role, setRoleState] = useState('owner')
  const [canEdit, setCanEdit] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionNote, setCorrectionNote] = useState('')
  const [timesheetPayroll, setTimesheetPayroll] = useState(null)
  const [selectedTsHeader, setSelectedTsHeader] = useState(null)
  const [tsHeaders, setTsHeaders] = useState([])
  const [showVerification, setShowVerification] = useState(false)
  const [gridViewMode, setGridViewMode] = useState('daily')
  const [gridClient, setGridClient] = useState('all')
  const [conflictPopover, setConflictPopover] = useState(null)
  const [gridKey, setGridKey] = useState(0)
  const [payslipViewer, setPayslipViewer] = useState(null)
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  useEffect(() => {
    // Check for pending timesheet data from upload page
    if (typeof window !== 'undefined') {
      const pending = localStorage.getItem('pending_timesheet_for_payroll')
      if (pending) {
        try {
          const data = JSON.parse(pending)
          setTimesheetPayroll(data)
          localStorage.removeItem('pending_timesheet_for_payroll')
        } catch(e) {}
      }
    }
    setRoleState(getRole())
    const batches = getAllPayrollBatches()
    setAllBatches(batches)
    if (batches.length > 0) {
      setSelectedMonth(batches[0].month)
      loadBatch(batches[0].month)
    }
    setPenalties(getPenaltyDeductions())
    setOfficeStaff(getVisibleWorkers().filter(w => w.category === 'Office Staff' && w.active !== false))
    const hdrs = getTimesheetHeaders()
    setTsHeaders(hdrs)
    if (hdrs.length > 0) setSelectedTsHeader(hdrs[0].id)
  }, [])

  const loadBatch = (month) => {
    const b = getPayrollBatchByMonth(month)
    setBatch(b)
    if (b) {
      setLines(getPayrollLinesByBatch(b.id))
      setCanEdit(canEditPayrollBatch(b.id))
    }
  }

  const handleMonthChange = (month) => {
    setSelectedMonth(month)
    loadBatch(month)
    setSelected(null)
  }

  const handleUnlock = () => {
    if (!unlockReason.trim()) return
    unlockPayrollBatch(batch.id, 'Management', unlockReason)
    setShowUnlock(false); setUnlockReason('')
    setAllBatches(getAllPayrollBatches()); loadBatch(selectedMonth)
  }

  const handleAddCorrection = () => {
    if (!correctionNote.trim()) return
    addCorrectionNote(batch.id, correctionNote, role === 'owner' ? 'Management' : 'HR Admin')
    setShowCorrection(false); setCorrectionNote('')
    loadBatch(selectedMonth)
  }

  if (!canAccess('payroll')) return <AppShell pageTitle="Payroll"><div className="page-shell"><div className="panel"><div className="empty-state"><h3>Access restricted</h3></div></div></div></AppShell>
  if (!batch) return null

  const filtered = tab === 'all' ? lines : lines.filter(l => {
    const w = { 'direct':'Permanent Staff','hourly':'Contract Worker','sub':'Subcontractor','office':'Office Staff' }[tab]
    return l.category === w
  })

  const gross = lines.reduce((s,l) => s + l.gross_pay, 0)
  const net = lines.reduce((s,l) => s + l.net_pay, 0)
  const deductions = lines.reduce((s,l) => s + l.deductions_total + l.advances_total, 0)
  const ramadanActive = getRamadanMode()?.active
  const wpsTotals = {
    wps: lines.filter(l => !l.payment_method || l.payment_method === 'WPS').reduce((s,l) => s + l.net_pay, 0),
    nonWps: lines.filter(l => l.payment_method === 'Non-WPS').reduce((s,l) => s + l.net_pay, 0),
    cash: lines.filter(l => l.payment_method === 'Cash').reduce((s,l) => s + l.net_pay, 0),
  }

  const handleAddAdj = () => {
    if (!selected || !adjForm.label || !adjForm.amount || !canEdit) return
    addPayrollAdjustment({ batch_id: batch.id, worker_id: selected.worker_id, adjustment_type: adjForm.type, label: adjForm.label, amount: Number(adjForm.amount) })
    setAdjForm({ type:'allowance', label:'', amount:'' })
  }

  return (<>
    <AppShell pageTitle="Payroll">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <p className="eyebrow">Payroll</p>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>{batch.month_label}</h1>
          <p style={{fontSize:12,color:'var(--muted)',marginTop:3}}>Review payroll lines before distribution</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="filter-select" value={selectedMonth||''} onChange={e => handleMonthChange(e.target.value)} style={{minWidth:200}}>
            {allBatches.map(b => <option key={b.id} value={b.month}>{b.month_label}{b.locked ? ' 🔒' : ''}{b.status === 'draft' ? ' (Draft)' : ''}</option>)}
          </select>
          <StatusBadge label={batch.locked ? '🔒 Locked' : batch.status} tone={batch.locked ? 'danger' : batch.status === 'ready_for_review' ? 'warning' : 'neutral'} />
          <button className="btn btn-teal btn-sm" onClick={async () => {
            const JSZip = (await import('jszip')).default
            const zip = new JSZip()
            const monthLabel = (batch.month_label||batch.month).replace(/\s+/g,'_')
            const folder = zip.folder(monthLabel+'_Payslips')
            const allW = getVisibleWorkers()
            lines.forEach(l => {
              const w = allW.find(wk => wk.id === l.worker_id) || { full_name:l.worker_name, worker_number:l.worker_number, category:l.category }
              const lb = calculateLeaveBalance(l.worker_id)
              const allPL = getPayrollLines()
              const yearLines = allPL.filter(pl => pl.worker_id === l.worker_id)
              const ytdData = { grossYtd:yearLines.reduce((s,p)=>s+(p.gross_pay||0),0), deductionsYtd:yearLines.reduce((s,p)=>s+(p.deductions_total||0)+(p.advances_total||0),0), netYtd:yearLines.reduce((s,p)=>s+(p.net_pay||0),0) }
              const isFlat = w.category==='Contract Worker'||w.category==='Subcontract Worker'
              const aLines = []
              if (!isFlat) {
                if (w.housing_allowance>0) aLines.push({label:'Housing Allowance',amount:w.housing_allowance})
                if (w.transport_allowance>0) aLines.push({label:'Transport Allowance',amount:w.transport_allowance})
                if (w.food_allowance>0) aLines.push({label:'Food / Meal Allowance',amount:w.food_allowance})
              }
              const dLines = []
              if (l.deductions_total>0) dLines.push({label:'Deductions',amount:l.deductions_total})
              if (l.advances_total>0) dLines.push({label:'Advance Recovery',amount:l.advances_total})
              if (w.iloe_monthly_deduction>0) dLines.push({label:'ILOE Insurance',amount:w.iloe_monthly_deduction})
              const html = payslipHTML(w, l, batch, { leaveBalance:lb, ytd:ytdData, ramadanActive:getRamadanMode()?.active, allowanceLines:aLines, deductionLines:dLines })
              const safeName = (w.full_name||'').replace(/\s+/g,'')
              folder.file(`${w.worker_number}_${safeName}_${monthLabel}.html`, html)
            })
            const blob = await zip.generateAsync({type:'blob'})
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `Innovation_Payslips_${monthLabel}.zip`; a.click()
            URL.revokeObjectURL(url)
          }}>Download All Payslips</button>
        </div>
      </div>

      {/* Lock Banner */}
      {batch.locked && (
        <div style={{background:'#fef2f2',border:'2px solid #fca5a5',borderRadius:12,padding:'20px 24px',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
              <div style={{fontSize:42}}>🔒</div>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:'#dc2626'}}>PAYROLL LOCKED</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Locked on {batch.locked_at ? new Date(batch.locked_at).toLocaleDateString('en-GB') : '—'} by {batch.locked_by}</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:6}}>This payroll cannot be edited. Corrections must be made in the following month.</div>
              </div>
            </div>
            {role === 'owner' && (
              <div style={{display:'flex',gap:8,flexShrink:0}}>
                <button className="btn btn-secondary" onClick={() => setShowCorrection(true)}>Add Correction Note</button>
                <button className="btn btn-danger" onClick={() => setShowUnlock(true)}>🔓 Unlock (Management Only)</button>
              </div>
            )}
          </div>
          {batch.correction_notes?.length > 0 && (
            <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid #fca5a5'}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:8}}>Correction Notes:</div>
              {batch.correction_notes.map((n, i) => (
                <div key={i} style={{background:'#fff',border:'1px solid #fca5a5',borderRadius:6,padding:'8px 12px',marginBottom:4}}>
                  <div style={{fontSize:12}}>{n.note}</div>
                  <div style={{fontSize:10,color:'var(--hint)',marginTop:4}}>Added by {n.added_by} on {new Date(n.added_at).toLocaleDateString('en-GB')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ramadanActive && <div style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,fontWeight:500}}>🌙 Ramadan Mode Active — OT threshold: 6hrs</div>}

      <div className="summary-strip">
        <div className="stat-card"><div className="num teal" style={{fontSize:18}}>{formatCurrency(gross)}</div><div className="lbl">Gross payroll</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:18}}>{formatCurrency(deductions)}</div><div className="lbl">Deductions + advances</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:18}}>{formatCurrency(net)}</div><div className="lbl">Net payroll</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{lines.length}</div><div className="lbl">Workers on batch</div></div>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['WPS (Endered)', wpsTotals.wps, '🏦'],['Non-WPS (Cash/Transfer)', wpsTotals.nonWps, '💵'],['Cash (Pending C3)', wpsTotals.cash, '⚠']].map(([label, amount, icon]) => (
          <div key={label} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 16px'}}>
            <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:4}}>{icon} {label}</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--teal)'}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
        ))}
      </div>

      {/* WhatsApp Numbers Panel */}
      <div style={{marginBottom:16}}>
        <button className="btn btn-ghost btn-sm" style={{fontSize:12}} onClick={() => setShowWhatsApp(!showWhatsApp)}>{showWhatsApp ? '▲' : '▼'} WhatsApp Numbers</button>
        {showWhatsApp && (
          <div className="panel" style={{marginTop:8}}>
            <div style={{fontSize:11,color:'var(--hint)',marginBottom:10,fontStyle:'italic'}}>WhatsApp distribution available in Supabase phase. Prepare numbers now — add via worker profile.</div>
            <div className="table-wrap"><table>
              <thead><tr><th>Worker</th><th>WhatsApp</th><th>Payslip</th></tr></thead>
              <tbody>{lines.map(l => {
                const w = getVisibleWorkers().find(wk => wk.id === l.worker_id)
                return (<tr key={l.id}><td style={{fontWeight:500,fontSize:12}}>{l.worker_name}<div style={{fontSize:10,color:'var(--hint)'}}>{l.worker_number}</div></td><td style={{fontSize:12,fontFamily:'monospace'}}>{w?.whatsapp_number || <span style={{color:'var(--hint)'}}>Not set</span>}</td><td>{l.payslip_sent ? <StatusBadge label="Sent" tone="success" /> : <StatusBadge label="Pending" tone="neutral" />}</td></tr>)
              })}</tbody>
            </table></div>
            <button className="btn btn-secondary btn-sm" style={{marginTop:8}} onClick={() => {
              const csv = 'Worker Name,Worker Number,WhatsApp Number\n' + lines.map(l => {
                const w = getVisibleWorkers().find(wk => wk.id === l.worker_id)
                return `"${l.worker_name}","${l.worker_number}","${w?.whatsapp_number||''}"`
              }).join('\n')
              const blob = new Blob([csv], {type:'text/csv'})
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'whatsapp_numbers.csv'; a.click()
              URL.revokeObjectURL(url)
            }}>Export Number List</button>
          </div>
        )}
      </div>

      {/* Payroll Run Checklist */}
      {!batch.locked && (() => {
        const pendConflicts = getPendingConflicts()
        const hrClarified = (typeof getAttendanceConflicts !== 'undefined' ? [] : []).length // imported via getPendingConflicts
        const carryOvers = getPendingCarryOverNotes()
        const pendingPenalties = penalties.filter(p => p.status === 'pending_hr_confirmation').length
        const today = new Date()
        const dueDate = new Date(today.getFullYear(), today.getMonth(), 17)
        const daysUntilDue = Math.ceil((dueDate - today) / (1000*60*60*24))
        return (
        <div className="panel" style={{marginBottom:16,border:'1px solid #fde68a',background:'#fffefb'}}>
          <div className="panel-header"><div><h2>Before approving payroll — complete these items</h2></div></div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0'}}>
              <span style={{fontSize:16}}>{pendConflicts.length === 0 ? '✅' : '🔴'}</span>
              <div style={{flex:1}}>
                {pendConflicts.length === 0
                  ? <span style={{fontSize:12,color:'#16a34a',fontWeight:600}}>No pending attendance conflicts</span>
                  : <span style={{fontSize:12,color:'#dc2626',fontWeight:600}}>{pendConflicts.length} conflict{pendConflicts.length!==1?'s':''} require resolution</span>}
              </div>
              {pendConflicts.length > 0 && <a href="/attendance" style={{fontSize:11,color:'var(--teal)'}}>Review conflicts →</a>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0'}}>
              <span style={{fontSize:16}}>{carryOvers.length === 0 ? '✅' : '🟡'}</span>
              <div style={{flex:1}}>
                {carryOvers.length === 0
                  ? <span style={{fontSize:12,color:'#16a34a',fontWeight:600}}>No carry-over items</span>
                  : <span style={{fontSize:12,color:'#d97706',fontWeight:600}}>{carryOvers.length} carry-over note{carryOvers.length!==1?'s':''} from last month</span>}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0'}}>
              <span style={{fontSize:16}}>{pendingPenalties === 0 ? '✅' : '🟡'}</span>
              <span style={{fontSize:12,color:pendingPenalties>0?'#d97706':'#16a34a',fontWeight:600}}>{pendingPenalties === 0 ? 'All penalties confirmed' : `${pendingPenalties} pending penalty confirmation${pendingPenalties!==1?'s':''}`}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0'}}>
              <span style={{fontSize:16}}>{daysUntilDue > 3 ? '⏱' : daysUntilDue > 0 ? '🟠' : '🚨'}</span>
              <span style={{fontSize:12,fontWeight:600,color:daysUntilDue<=0?'#dc2626':daysUntilDue<=3?'#d97706':'var(--muted)'}}>{daysUntilDue > 3 ? `Payroll due ${dueDate.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : daysUntilDue > 0 ? `Payroll due in ${daysUntilDue} day${daysUntilDue!==1?'s':''}` : 'OVERDUE — Payroll should have been approved'}</span>
            </div>
          </div>
          {pendConflicts.filter(c => new Date(c.auto_resolve_date) <= today).length > 0 && (
            <button className="btn btn-secondary btn-sm" style={{marginTop:8}} onClick={() => { const notes = autoResolveExpiredConflicts(); alert(`Auto-resolved ${notes.length} conflict(s). ${notes.length} carry-over note(s) created.`) }}>Run Auto-Resolve</button>
          )}
        </div>)
      })()}

      {/* Timesheet Payroll Preview */}
      {timesheetPayroll && (
        <div className="panel" style={{marginBottom:16,border:'2px solid var(--teal-border)',background:'var(--teal-bg)'}}>
          <div className="panel-header"><div><h2>📊 Payroll from Timesheet — {timesheetPayroll.month} {timesheetPayroll.year}</h2><p>Client: {timesheetPayroll.client} · {timesheetPayroll.workers?.length || 0} workers</p></div><button className="btn btn-ghost btn-sm" onClick={() => setTimesheetPayroll(null)}>✕ Dismiss</button></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Worker</th><th>Total Hrs</th><th>Regular</th><th>OT</th><th>Holiday</th><th>Basic</th><th>OT Pay</th><th>Holiday Pay</th><th>Allowances</th><th>ILOE</th><th>Net Pay</th></tr></thead>
            <tbody>{(timesheetPayroll.workers||[]).map((w, i) => {
              const worker = getVisibleWorkers().find(wk => wk.id === w.worker_id)
              if (!worker) return null
              const baseHourlyRate = worker.monthly_salary / 30 / 8
              const weekdayOtPay = Math.round(w.ot_hours * baseHourlyRate * 1.25 * 100) / 100
              const holidayOtPay = Math.round((w.holiday_hours||0) * baseHourlyRate * 1.50 * 100) / 100
              const allowances = (worker.housing_allowance||0) + (worker.transport_allowance||0) + (worker.food_allowance||0)
              const iloe = worker.iloe_monthly_deduction || 0
              const gross = worker.monthly_salary + allowances + weekdayOtPay + holidayOtPay
              const net = Math.round((gross - iloe) * 100) / 100
              return (
                <tr key={i}>
                  <td style={{fontWeight:500}}>{w.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{w.worker_number}</div></td>
                  <td style={{fontWeight:600}}>{w.total_hours}h</td>
                  <td>{w.regular_hours}h</td>
                  <td style={{color:w.ot_hours>0?'var(--warning)':'var(--hint)',fontWeight:w.ot_hours>0?600:400}}>{w.ot_hours}h</td>
                  <td style={{color:(w.holiday_hours||0)>0?'var(--danger)':'var(--hint)',fontWeight:(w.holiday_hours||0)>0?600:400}}>{w.holiday_hours||0}h</td>
                  <td style={{fontSize:12}}>AED {worker.monthly_salary?.toLocaleString()}</td>
                  <td style={{fontSize:12,color:'var(--success)'}}>{weekdayOtPay > 0 ? 'AED '+weekdayOtPay.toLocaleString() : '—'}</td>
                  <td style={{fontSize:12,color:'var(--danger)'}}>{holidayOtPay > 0 ? 'AED '+holidayOtPay.toLocaleString() : '—'}</td>
                  <td style={{fontSize:12}}>AED {allowances.toLocaleString()}</td>
                  <td style={{fontSize:12,color:'var(--danger)'}}>-{iloe}</td>
                  <td style={{fontWeight:700,color:'var(--teal)'}}>AED {net.toLocaleString()}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
        </div>
      )}

      {/* Office Staff */}
      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-header"><div><h2>Office staff — monthly salary</h2><p>Exempt from timesheets. Salary runs automatically.</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Worker ID</th><th>Basic salary</th><th>Housing</th><th>Transport</th><th>Total package</th><th>Payment</th></tr></thead>
          <tbody>{officeStaff.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--hint)',padding:16}}>No office staff</td></tr> : officeStaff.map(w => {
            const total = (w.monthly_salary||0)+(w.housing_allowance||0)+(w.transport_allowance||0)+(w.food_allowance||0)
            return (<tr key={w.id}><td style={{fontWeight:500}}>{w.full_name}<div style={{fontSize:11,color:'var(--hint)'}}>{w.trade_role}</div></td><td style={{fontFamily:'monospace',fontSize:12}}>{w.worker_number}</td><td>AED {(w.monthly_salary||0).toLocaleString()}</td><td style={{fontSize:12,color:'var(--muted)'}}>{w.housing_allowance>0?'AED '+w.housing_allowance:'—'}</td><td style={{fontSize:12,color:'var(--muted)'}}>{w.transport_allowance>0?'AED '+w.transport_allowance:'—'}</td><td style={{fontWeight:700,color:'var(--teal)'}}>AED {total.toLocaleString()}</td><td><StatusBadge label={w.payment_method||'WPS'} tone={w.payment_method==='WPS'?'success':'warning'} /></td></tr>)
          })}</tbody>
        </table></div>
      </div>

      {/* Main payroll table */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
        <div className="panel">
          <div className="tabs">
            {[['all','All'],['direct','Direct'],['hourly','Hourly'],['sub','Sub'],['office','Office'],['timesheet_review','Timesheet Review'],['archive','Archive']].map(([key,label]) => (
              <button key={key} className={`tab${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          {tab === 'archive' ? (() => {
            const years = [2026, 2025, 2024, 2023, 2022]
            const expandedYears = typeof window !== 'undefined' ? (window.__archiveExpanded || {}) : {}
            const toggleYear = (y) => { if (typeof window !== 'undefined') { window.__archiveExpanded = {...(window.__archiveExpanded||{}), [y]:!(window.__archiveExpanded||{})[y]}; setGridKey(k=>k+1) } }
            return (<div style={{padding:0}}>
              <div style={{marginBottom:20}}>
                <h2 style={{fontSize:20,fontWeight:700,margin:'0 0 4px'}}>Payroll Archive — 5 Year Record</h2>
                <p style={{fontSize:12,color:'var(--muted)',margin:'0 0 10px'}}>Records retained per UAE Labour Law Federal Decree-Law No. 33 of 2021.<br/>Minimum retention: 2 years post-termination. IWS policy: 5 years.</p>
                <span style={{display:'inline-block',background:'#dcfce7',color:'#166534',fontSize:11,fontWeight:600,borderRadius:20,padding:'4px 12px'}}>&#10003; UAE Compliant — 5 Year Retention Policy</span>
              </div>

              {years.map(year => {
                const yearBatches = getPayrollHistoryByYear(year)
                const yearSummary = getPayrollYearSummary(year)
                const expanded = expandedYears[year]
                const totalGross = yearSummary?.total_gross || yearBatches.reduce((s,b) => s + (b.total_gross||0), 0)
                const totalNet = yearSummary?.total_net || yearBatches.reduce((s,b) => s + (b.total_net||0), 0)
                const allLocked = yearBatches.length > 0 && yearBatches.every(b => b.locked)
                const unlockedCount = yearBatches.filter(b => !b.locked).length

                return (
                <div key={year} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,marginBottom:10,overflow:'hidden'}}>
                  <div onClick={() => toggleYear(year)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:16,cursor:'pointer'}}>
                    <div style={{fontSize:18,fontWeight:700,color:'#0f172a',minWidth:60}}>{year}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{yearBatches.length}/12 months</div>
                    {yearBatches.length > 0 ? <>
                      <div style={{fontSize:11,color:'var(--teal)',fontWeight:600}}>Gross: {formatCurrency(totalGross)}</div>
                      <div style={{fontSize:11,color:'var(--success)',fontWeight:600}}>Net: {formatCurrency(totalNet)}</div>
                      <span style={{fontSize:10,fontWeight:600,borderRadius:10,padding:'2px 8px',background:allLocked?'#dcfce7':'#fef3c7',color:allLocked?'#166534':'#92400e'}}>{allLocked ? 'All locked ✓' : unlockedCount+' unlocked ⚠'}</span>
                    </> : <div style={{fontSize:11,color:'var(--hint)',fontStyle:'italic'}}>No records on file</div>}
                    <div style={{marginLeft:'auto',fontSize:12,color:'var(--muted)'}}>{expanded ? '▲' : '▼'} View months</div>
                  </div>

                  {expanded && yearBatches.length > 0 && (
                  <div style={{borderTop:'1px solid var(--border)',padding:0}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                      <thead><tr style={{background:'#f1f5f9'}}>
                        <th style={{padding:'6px 10px',textAlign:'left'}}>Month</th>
                        <th style={{padding:'6px 8px',textAlign:'center'}}>Workers</th>
                        <th style={{padding:'6px 8px',textAlign:'right'}}>Gross</th>
                        <th style={{padding:'6px 8px',textAlign:'right'}}>Net</th>
                        <th style={{padding:'6px 8px',textAlign:'right'}}>WPS</th>
                        <th style={{padding:'6px 8px',textAlign:'right'}}>Non-WPS</th>
                        <th style={{padding:'6px 8px',textAlign:'right'}}>Cash</th>
                        <th style={{padding:'6px 8px',textAlign:'left'}}>Locked By</th>
                        <th style={{padding:'6px 8px',textAlign:'left'}}>Lock Date</th>
                        <th style={{padding:'6px 8px',textAlign:'left'}}>Retention</th>
                        <th style={{padding:'6px 8px',textAlign:'center'}}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {yearBatches.map(b => {
                          const retention = getRetentionStatus(b)
                          const retColor = !b.locked ? '#dc2626' : retention.years_remaining <= 1 ? '#d97706' : '#16a34a'
                          const retBg = !b.locked ? '#fee2e2' : retention.years_remaining <= 1 ? '#fef3c7' : '#dcfce7'
                          return (
                          <tr key={b.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                            <td style={{padding:'6px 10px',fontWeight:500}}>{b.month_label}</td>
                            <td style={{padding:'6px 8px',textAlign:'center'}}>{b.total_workers || '—'}</td>
                            <td style={{padding:'6px 8px',textAlign:'right',color:'var(--teal)',fontWeight:600}}>{b.total_gross ? formatCurrency(b.total_gross) : '—'}</td>
                            <td style={{padding:'6px 8px',textAlign:'right',color:'var(--success)',fontWeight:600}}>{b.total_net ? formatCurrency(b.total_net) : '—'}</td>
                            <td style={{padding:'6px 8px',textAlign:'right',fontSize:10}}>{b.wps_total ? formatCurrency(b.wps_total) : '—'}</td>
                            <td style={{padding:'6px 8px',textAlign:'right',fontSize:10}}>{b.non_wps_total ? formatCurrency(b.non_wps_total) : '—'}</td>
                            <td style={{padding:'6px 8px',textAlign:'right',fontSize:10}}>{b.cash_total ? formatCurrency(b.cash_total) : '—'}</td>
                            <td style={{padding:'6px 8px',fontSize:10}}>{b.locked_by || '—'}</td>
                            <td style={{padding:'6px 8px',fontSize:10}}>{b.locked_at ? new Date(b.locked_at).toLocaleDateString('en-GB') : '—'}</td>
                            <td style={{padding:'6px 8px'}}><span style={{fontSize:9,fontWeight:600,background:retBg,color:retColor,borderRadius:10,padding:'2px 8px',whiteSpace:'nowrap'}}>{!b.locked ? '⚠ Not locked' : retention.years_remaining <= 1 ? '⚠ Expires soon' : '✓ '+retention.message}</span></td>
                            <td style={{padding:'6px 8px',textAlign:'center'}}>
                              <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 6px'}} onClick={() => { handleMonthChange(b.month); setTab('all') }}>View</button>
                            </td>
                          </tr>)
                        })}
                      </tbody>
                    </table>
                  </div>)}

                  {expanded && yearBatches.length === 0 && (
                    <div style={{borderTop:'1px solid var(--border)',padding:'16px',color:'var(--hint)',fontSize:12,fontStyle:'italic'}}>No records on file for this year</div>
                  )}
                </div>)
              })}

              {/* Compliance Summary */}
              <div style={{marginTop:24,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:16}}>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>UAE Record Retention Compliance Status</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>Federal Decree-Law No. 33 of 2021 — Employer obligations</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{background:'#f1f5f9'}}>
                    <th style={{padding:'8px 12px',textAlign:'left',borderBottom:'2px solid var(--border)'}}>Record Type</th>
                    <th style={{padding:'8px 12px',textAlign:'center',borderBottom:'2px solid var(--border)'}}>Required</th>
                    <th style={{padding:'8px 12px',textAlign:'center',borderBottom:'2px solid var(--border)'}}>IWS Policy</th>
                    <th style={{padding:'8px 12px',textAlign:'center',borderBottom:'2px solid var(--border)'}}>Status</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ['Payroll records','2 years','5 years','✓ Active','#16a34a','#dcfce7'],
                      ['Timesheets','2 years','5 years','✓ Active','#16a34a','#dcfce7'],
                      ['Warning letters','2 years','5 years','✓ Active','#16a34a','#dcfce7'],
                      ['WPS payment records','2 years','5 years','✓ Active','#16a34a','#dcfce7'],
                      ['Worker documents','2 years','5 years','⏳ Supabase','#d97706','#fef3c7'],
                      ['Employment contracts','2 years','5 years','⏳ Supabase','#d97706','#fef3c7'],
                    ].map(([type,req,iws,status,color,bg]) => (
                      <tr key={type} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'6px 12px',fontWeight:500}}>{type}</td>
                        <td style={{padding:'6px 12px',textAlign:'center'}}>{req}</td>
                        <td style={{padding:'6px 12px',textAlign:'center',fontWeight:600}}>{iws}</td>
                        <td style={{padding:'6px 12px',textAlign:'center'}}><span style={{fontSize:11,fontWeight:600,background:bg,color,borderRadius:10,padding:'2px 10px'}}>{status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{marginTop:14,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:'10px 14px',fontSize:11,color:'#475569',lineHeight:1.7}}>
                  Labour dispute claims may be filed within 2 years of termination (Federal Decree-Law No. 9 of 2024, effective August 2024).<br/>
                  All IWS records are retained for 5 years — well within this window.<br/>
                  <em>Note: Items marked Supabase will have file storage active after database migration.</em>
                </div>
              </div>
            </div>)
          })() : tab !== 'timesheet_review' ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Worker</th><th>Type</th><th>Payment</th><th>Normal pay</th><th>OT pay</th><th>Allowances</th><th>Deductions</th><th>Net pay</th><th>C3</th></tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{cursor:'pointer',background:selected?.id===l.id?'#eff6ff':''}} onClick={() => setSelected(l)}>
                  <td style={{fontWeight:500}}>{l.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{l.worker_number}</div></td>
                  <td><StatusBadge label={l.payroll_type} tone="neutral" /></td>
                  <td><StatusBadge label={l.payment_method||'WPS'} tone={l.payment_method==='Non-WPS'?'warning':l.payment_method==='Cash'?'danger':'success'} /></td>
                  <td style={{fontSize:12}}>{formatCurrency(l.normal_pay)}</td>
                  <td style={{fontSize:12}}>{formatCurrency(l.ot_pay)}</td>
                  <td style={{fontSize:12,color:'var(--success)'}}>{formatCurrency(l.allowances_total)}</td>
                  <td style={{fontSize:12,color:'var(--danger)'}}>{formatCurrency(l.deductions_total + l.advances_total)}</td>
                  <td style={{fontSize:13,fontWeight:600,color:'var(--teal)'}}>{formatCurrency(l.net_pay)}</td>
                  <td><StatusBadge label={l.c3_status?.slice(0,12)} tone={l.c3_status?.includes('Not') ? 'neutral' : l.c3_status?.includes('Blocked') ? 'danger' : 'warning'} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          ) : (() => {
            // TIMESHEET REVIEW TAB
            const allWorkers = getVisibleWorkers()
            const ramadan = getRamadanMode()
            const selHeader = tsHeaders.find(h => h.id === selectedTsHeader)
            const tsLines = selHeader ? getTimesheetLines(selHeader.id) : []
            // Group lines by worker
            const byWorker = {}
            tsLines.forEach(l => {
              if (!byWorker[l.worker_id]) byWorker[l.worker_id] = { worker_id:l.worker_id, worker_name:l.worker_name, worker_number:l.worker_number, trade_role:l.trade_role, days:{} }
              const day = l.work_date ? parseInt(l.work_date.split('-')[2]) : 0
              if (day > 0) byWorker[l.worker_id].days[day] = (byWorker[l.worker_id].days[day]||0) + l.total_hours
            })
            const workerRows = Object.values(byWorker)
            // Figure out how many days this month has
            let daysInMonth = 31
            if (selHeader?.date) { const [y,m] = selHeader.date.split('-').map(Number); daysInMonth = new Date(y, m, 0).getDate() }
            const dayNums = Array.from({length:daysInMonth},(_,i)=>i+1)
            // Calculate per-worker totals
            const calcRows = workerRows.map(wr => {
              const worker = allWorkers.find(w => w.id === wr.worker_id)
              const isFlat = worker && (worker.category === 'Contract Worker' || worker.category === 'Subcontract Worker')
              const baseRate = worker ? (isFlat ? (worker.hourly_rate||0) : (worker.monthly_salary||0)/30/8) : 0
              const otThreshold = ramadan?.active ? 6 : 8
              let totalHrs=0, normalHrs=0, otHrs=0, holidayHrs=0
              const monthStr = selHeader?.date?.slice(0,7) || '2026-04'
              dayNums.forEach(d => {
                const hrs = wr.days[d] || 0
                if (hrs <= 0) return
                totalHrs += hrs
                const dateStr = monthStr + '-' + String(d).padStart(2,'0')
                const isFriday = new Date(dateStr).getDay() === 5
                const isHol = isPublicHoliday(dateStr) || isFriday
                if (isHol) { holidayHrs += hrs }
                else { normalHrs += Math.min(hrs, otThreshold); otHrs += Math.max(0, hrs - otThreshold) }
              })
              const otPay = isFlat ? 0 : Math.round(otHrs * baseRate * 1.25 * 100)/100
              const holPay = Math.round(holidayHrs * baseRate * 1.5 * 100)/100
              const totalEarnings = isFlat ? Math.round(totalHrs * baseRate * 100)/100 : (worker?.monthly_salary||0) + otPay + holPay
              return { ...wr, worker, isFlat, baseRate:Math.round(baseRate*100)/100, totalHrs:Math.round(totalHrs*100)/100, normalHrs:Math.round(normalHrs*100)/100, otHrs:Math.round(otHrs*100)/100, holidayHrs:Math.round(holidayHrs*100)/100, otPay, holPay, totalEarnings:Math.round(totalEarnings*100)/100 }
            })
            const grandTotalHrs = calcRows.reduce((s,r)=>s+r.totalHrs,0)
            const grandOtHrs = calcRows.reduce((s,r)=>s+r.otHrs,0)
            const grandEarnings = calcRows.reduce((s,r)=>s+r.totalEarnings,0)
            // Reconciliation against payroll lines
            const reconRows = calcRows.map(cr => {
              const pl = lines.find(l => l.worker_id === cr.worker_id)
              const plNet = pl ? pl.net_pay : null
              const diff = plNet !== null ? Math.round((cr.totalEarnings - plNet)*100)/100 : null
              return { ...cr, payroll_net: plNet, diff, status: plNet === null ? 'missing_payroll' : Math.abs(diff) < 1 ? 'match' : 'mismatch' }
            })
            // Workers in payroll but not in timesheet
            const tsWorkerIds = new Set(calcRows.map(r=>r.worker_id))
            const missingTs = lines.filter(l => !tsWorkerIds.has(l.worker_id))
            const mismatchCount = reconRows.filter(r=>r.status==='mismatch').length + reconRows.filter(r=>r.status==='missing_payroll').length + missingTs.length

            return (<div>
              {/* Header selector */}
              <div style={{marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
                <label style={{fontSize:12,fontWeight:600,color:'var(--muted)'}}>Timesheet:</label>
                <select className="filter-select" value={selectedTsHeader||''} onChange={e => setSelectedTsHeader(e.target.value)}>
                  {tsHeaders.map(h => <option key={h.id} value={h.id}>{h.client_name} · {h.job_no} · {h.date?.slice(0,10)}</option>)}
                </select>
              </div>

              {/* Summary strip */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
                <div className="stat-card"><div className="num" style={{fontSize:18}}>{calcRows.length}</div><div className="lbl">Workers</div></div>
                <div className="stat-card"><div className="num" style={{fontSize:18}}>{Math.round(grandTotalHrs)}</div><div className="lbl">Total hours</div></div>
                <div className="stat-card"><div className={`num ${grandOtHrs>0?'warning':''}`} style={{fontSize:18}}>{Math.round(grandOtHrs)}</div><div className="lbl">OT hours</div></div>
                <div className="stat-card"><div className="num teal" style={{fontSize:18}}>{formatCurrency(grandEarnings)}</div><div className="lbl">Total earnings</div></div>
              </div>

              {/* Consolidated hours table */}
              {!selHeader ? <div style={{color:'var(--hint)',padding:24,textAlign:'center'}}>Select a timesheet above</div> : (
              <div style={{overflowX:'auto',marginBottom:20}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{background:'var(--surface)'}}>
                    <th style={{padding:'6px 8px',textAlign:'left',position:'sticky',left:0,background:'var(--surface)',zIndex:2,minWidth:140,borderRight:'2px solid var(--border)',fontSize:10,fontWeight:600}}>WORKER</th>
                    {dayNums.map(d => <th key={d} style={{padding:'4px 2px',textAlign:'center',minWidth:36,fontSize:10,fontWeight:500,color:'var(--muted)'}}>{d}</th>)}
                    <th style={{padding:'6px 4px',textAlign:'center',borderLeft:'2px solid var(--border)',fontSize:10,fontWeight:700,background:'#eff6ff',minWidth:50}}>TOTAL</th>
                    <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:44}}>NORM</th>
                    <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:36}}>OT</th>
                    <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:36}}>HOL</th>
                    <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:55}}>RATE</th>
                    <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:60}}>OT PAY</th>
                    <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:60}}>HOL PAY</th>
                    <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,fontWeight:700,minWidth:75,background:'#eff6ff'}}>EARNINGS</th>
                  </tr></thead>
                  <tbody>
                    {calcRows.map((cr,ri) => {
                      const monthStr = selHeader?.date?.slice(0,7) || '2026-04'
                      return (
                      <tr key={ri} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'6px 8px',position:'sticky',left:0,background:ri%2===0?'#fff':'#fafbfc',zIndex:1,borderRight:'2px solid var(--border)'}}>
                          <div style={{fontWeight:500,fontSize:11}}>{cr.worker_name}</div>
                          <div style={{fontSize:9,color:'var(--hint)'}}>{cr.worker_number}</div>
                        </td>
                        {dayNums.map(d => {
                          const hrs = cr.days[d] || 0
                          const dateStr = monthStr+'-'+String(d).padStart(2,'0')
                          const isFri = new Date(dateStr).getDay() === 5
                          const isHol = isPublicHoliday(dateStr) || isFri
                          const bg = hrs <= 0 ? '#f8fafc' : isHol ? '#fef2f2' : hrs > 8 ? '#fffbeb' : '#f0fdf4'
                          const color = hrs <= 0 ? 'var(--hint)' : isHol ? '#dc2626' : hrs > 8 ? '#92400e' : '#166534'
                          return <td key={d} style={{padding:'3px 1px',textAlign:'center',background:bg,fontSize:11,fontWeight:hrs>0?600:400,color,fontFamily:'monospace'}}>{hrs>0?hrs:'—'}</td>
                        })}
                        <td style={{padding:'6px 4px',textAlign:'center',borderLeft:'2px solid var(--border)',fontWeight:700,fontSize:12,background:'#eff6ff',color:'var(--teal)'}}>{cr.totalHrs}</td>
                        <td style={{padding:'4px',textAlign:'center',fontSize:11}}>{cr.normalHrs}</td>
                        <td style={{padding:'4px',textAlign:'center',fontSize:11,color:cr.otHrs>0?'var(--warning)':'var(--hint)',fontWeight:cr.otHrs>0?600:400}}>{cr.otHrs}</td>
                        <td style={{padding:'4px',textAlign:'center',fontSize:11,color:cr.holidayHrs>0?'var(--danger)':'var(--hint)',fontWeight:cr.holidayHrs>0?600:400}}>{cr.holidayHrs}</td>
                        <td style={{padding:'4px',textAlign:'center',fontSize:10,color:'var(--muted)'}}>{cr.baseRate}</td>
                        <td style={{padding:'4px',textAlign:'center',fontSize:11,color:'var(--success)'}}>{cr.otPay>0?cr.otPay:'—'}</td>
                        <td style={{padding:'4px',textAlign:'center',fontSize:11,color:'var(--danger)'}}>{cr.holPay>0?cr.holPay:'—'}</td>
                        <td style={{padding:'6px 4px',textAlign:'center',fontWeight:700,fontSize:12,background:'#eff6ff',color:'var(--teal)'}}>{formatCurrency(cr.totalEarnings)}</td>
                      </tr>)
                    })}
                  </tbody>
                </table>
              </div>)}

              {/* Reconciliation */}
              {calcRows.length > 0 && (
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:16}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Reconciliation: Timesheet vs Payroll</div>
                <div className="table-wrap"><table>
                  <thead><tr><th>Worker</th><th>Timesheet Total</th><th>Payroll Net</th><th>Difference</th><th>Status</th></tr></thead>
                  <tbody>
                    {reconRows.map((r,i) => (
                      <tr key={i} style={{background:r.status==='mismatch'?'#fef2f2':r.status==='missing_payroll'?'#fef2f2':''}}>
                        <td style={{fontWeight:500,fontSize:12}}>{r.worker_name}<div style={{fontSize:10,color:'var(--hint)'}}>{r.worker_number}</div></td>
                        <td style={{fontSize:12}}>{formatCurrency(r.totalEarnings)}</td>
                        <td style={{fontSize:12}}>{r.payroll_net !== null ? formatCurrency(r.payroll_net) : <span style={{color:'var(--danger)',fontWeight:600}}>Missing from payroll</span>}</td>
                        <td style={{fontSize:12,fontWeight:600,color:r.diff && Math.abs(r.diff)>=1?'var(--danger)':'var(--success)'}}>{r.diff !== null ? (r.diff >= 0 ? '+' : '') + formatCurrency(r.diff) : '—'}</td>
                        <td>{r.status === 'match' ? <StatusBadge label="✓ Match" tone="success" /> : r.status === 'missing_payroll' ? <StatusBadge label="Missing from payroll" tone="danger" /> : <StatusBadge label="⚠ Mismatch" tone="danger" />}</td>
                      </tr>
                    ))}
                    {missingTs.map((l,i) => (
                      <tr key={'mt-'+i} style={{background:'#fffbeb'}}>
                        <td style={{fontWeight:500,fontSize:12}}>{l.worker_name}<div style={{fontSize:10,color:'var(--hint)'}}>{l.worker_number}</div></td>
                        <td style={{fontSize:12,color:'var(--warning)'}}><em>No timesheet found</em></td>
                        <td style={{fontSize:12}}>{formatCurrency(l.net_pay)}</td>
                        <td>—</td>
                        <td><StatusBadge label="No timesheet" tone="warning" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <div style={{marginTop:10,fontSize:12,color:mismatchCount>0?'var(--danger)':'var(--success)',fontWeight:600}}>
                  {mismatchCount === 0 ? '✓ All workers reconciled — no mismatches' : `⚠ ${mismatchCount} issue${mismatchCount>1?'s':''} found — review before approving payroll`}
                </div>
              </div>)}
            </div>)
          })()}
        </div>

        {selected && (
          <div className="panel">
            <div className="panel-header"><div><h2>{selected.worker_name}</h2><p>{selected.worker_number} · {selected.category}</p></div></div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {[['Rate / salary', selected.payroll_type === 'monthly' ? formatCurrency(selected.rate_or_salary) + '/mo' : formatCurrency(selected.rate_or_salary) + '/hr'],['Normal hours',selected.normal_hours+'h'],['OT hours',selected.ot_hours+'h'],['Holiday hours',selected.holiday_hours+'h'],['Normal pay',formatCurrency(selected.normal_pay)],['OT pay',formatCurrency(selected.ot_pay)],['Holiday pay',formatCurrency(selected.holiday_ot_pay)],['Allowances',formatCurrency(selected.allowances_total)],['Deductions',formatCurrency(selected.deductions_total)],['Advances',formatCurrency(selected.advances_total)]].map(([label,value]) => (
                <div key={label} className="metric-row"><span className="label">{label}</span><span className="value" style={{fontSize:12}}>{value}</span></div>
              ))}
              <div className="metric-row" style={{borderTop:'1.5px solid var(--border)',paddingTop:10}}>
                <span style={{fontWeight:600,fontSize:13}}>Net pay</span>
                <span style={{fontWeight:700,fontSize:15,color:'var(--teal)'}}>{formatCurrency(selected.net_pay)}</span>
              </div>
            </div>
            {canEdit && <>
              <div style={{fontSize:12,fontWeight:500,marginBottom:8,color:'var(--muted)'}}>Add adjustment</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <select className="form-select" style={{fontSize:12}} value={adjForm.type} onChange={e => setAdjForm({...adjForm,type:e.target.value})}><option value="allowance">Allowance</option><option value="deduction">Deduction</option><option value="advance">Advance</option></select>
                <input className="form-input" style={{fontSize:12}} placeholder="Label" value={adjForm.label} onChange={e => setAdjForm({...adjForm,label:e.target.value})} />
                <input className="form-input" style={{fontSize:12}} placeholder="Amount (AED)" type="number" value={adjForm.amount} onChange={e => setAdjForm({...adjForm,amount:e.target.value})} />
                <button className="btn btn-teal btn-sm" onClick={handleAddAdj}>Add adjustment</button>
              </div>
            </>}
            {!canEdit && <div style={{fontSize:12,color:'var(--hint)',padding:'8px 0',fontStyle:'italic'}}>🔒 Payroll locked — adjustments not allowed</div>}
            {penalties.filter(p => p.worker_id === selected?.worker_id).length > 0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,fontWeight:500,color:'var(--muted)',marginBottom:8}}>WARNING PENALTIES</div>
                {penalties.filter(p => p.worker_id === selected.worker_id).map(p => (
                  <div key={p.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:500}}>{p.label}</div>
                    <div style={{fontSize:12,color:'var(--danger)',fontWeight:600}}>AED {p.amount.toFixed(2)}</div>
                    <div style={{fontSize:11,color:'var(--hint)',marginBottom:6}}>{p.status === 'pending_hr_confirmation' ? '⏳ Awaiting HR confirmation' : '✓ Confirmed'}</div>
                    {canEdit && <div style={{display:'flex',gap:6}}>
                      {p.status === 'pending_hr_confirmation' && <button className="btn btn-teal btn-sm" onClick={() => { confirmPenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()) }}>Confirm</button>}
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => { removePenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()) }}>Remove</button>
                    </div>}
                  </div>
                ))}
              </div>
            )}
            <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid var(--border)'}}>
              <button className="btn btn-teal btn-sm" style={{width:'100%'}} onClick={() => {
                const worker = getWorker(selected.worker_id) || getVisibleWorkers().find(w => w.id === selected.worker_id)
                if (!worker) return
                const leaveBalance = calculateLeaveBalance(worker.id)
                const allPL = getPayrollLines()
                const yearLines = allPL.filter(l => l.worker_id === worker.id && l.batch_id?.includes(`-${batch.year || '2026'}-`))
                const ytd = {
                  grossYtd: yearLines.reduce((s,l) => s + (l.gross_pay||0), 0),
                  deductionsYtd: yearLines.reduce((s,l) => s + (l.deductions_total||0) + (l.advances_total||0), 0),
                  netYtd: yearLines.reduce((s,l) => s + (l.net_pay||0), 0)
                }
                const isFlat = worker.category === 'Contract Worker' || worker.category === 'Subcontract Worker'
                const allowanceLines = []
                if (!isFlat) {
                  if (worker.housing_allowance > 0) allowanceLines.push({ label: 'Housing Allowance', amount: worker.housing_allowance })
                  if (worker.transport_allowance > 0) allowanceLines.push({ label: 'Transport Allowance', amount: worker.transport_allowance })
                  if (worker.food_allowance > 0) allowanceLines.push({ label: 'Food / Meal Allowance', amount: worker.food_allowance })
                  if (worker.other_allowance > 0) allowanceLines.push({ label: 'Other Allowance', amount: worker.other_allowance })
                }
                const deductionLines = []
                if (selected.deductions_total > 0) deductionLines.push({ label: 'Deductions', amount: selected.deductions_total })
                if (selected.advances_total > 0) deductionLines.push({ label: 'Advance Recovery', amount: selected.advances_total })
                const workerPenalties = penalties.filter(p => p.worker_id === worker.id && p.status === 'confirmed')
                workerPenalties.forEach(p => deductionLines.push({ label: 'Disciplinary Penalty', amount: p.amount }))
                if (worker.iloe_monthly_deduction > 0) deductionLines.push({ label: 'ILOE Insurance', amount: worker.iloe_monthly_deduction })

                const html = payslipHTML(worker, selected, batch, {
                  leaveBalance, ytd,
                  ramadanActive: getRamadanMode()?.active,
                  allowanceLines, deductionLines
                })
                const ref = `IT-PS-${batch.month_label?.replace(/\s+/g,'-') || batch.month}-${worker.worker_number}`
                setPayslipViewer({ html, ref })
              }}>Generate Payslip</button>
            </div>
          </div>
        )}
      </div>

      {!canEdit && batch.locked && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'12px 16px',marginTop:16,fontSize:12,color:'#92400e'}}>
          <strong>Note:</strong> This payroll is locked. To correct errors, add a correction note and adjust in the following month&apos;s payroll.
        </div>
      )}

      {/* Monthly Timesheet & Payroll Review */}
      {lines.length > 0 && (() => {
        const allW = getVisibleWorkers().filter(w => w.category !== 'Office Staff' && w.active !== false)
        const ramadan = getRamadanMode()
        const otThreshold = ramadan?.active ? 6 : 8
        // Determine month from batch
        const batchMonth = batch.month || '2026-04'
        const [bYear, bMonth] = batchMonth.split('-').map(Number)
        const daysInMonth = new Date(bYear, bMonth, 0).getDate()
        const dayNums = Array.from({length:daysInMonth},(_,i)=>i+1)
        const monthStr = batchMonth
        const monthLabel = new Date(bYear, bMonth-1, 1).toLocaleDateString('en-GB',{month:'long',year:'numeric'})

        // Get all timesheet lines for this month
        const allTsLines = getAllTimesheetLines().filter(l => l.work_date && l.work_date.startsWith(monthStr))
        const allHeaders = getTimesheetHeaders()

        // Distinct clients
        const clientSet = new Set()
        allHeaders.forEach(h => { if (h.client_name) clientSet.add(h.client_name) })
        const clients = [...clientSet].sort()

        // Client header IDs (non-internal)
        const internalClients = ['Innovation Technologies']
        const clientHeaderIds = new Set(allHeaders.filter(h => !internalClients.includes(h.client_name)).map(h => h.id))
        const iwsHeaderIds = new Set(allHeaders.filter(h => internalClients.includes(h.client_name)).map(h => h.id))

        // Filter lines by selected client
        const filteredClientHeaderIds = gridClient === 'all'
          ? clientHeaderIds
          : new Set(allHeaders.filter(h => h.client_name === gridClient).map(h => h.id))

        // Build per-worker day data
        const workerMap = {}
        allW.forEach(w => {
          workerMap[w.id] = { worker: w, clientDays: {}, iwsDays: {}, iwsLinesByDay: {} }
        })
        allTsLines.forEach(l => {
          if (!workerMap[l.worker_id]) return
          const day = parseInt(l.work_date.split('-')[2])
          if (clientHeaderIds.has(l.header_id)) {
            if (filteredClientHeaderIds.has(l.header_id)) {
              workerMap[l.worker_id].clientDays[day] = (workerMap[l.worker_id].clientDays[day]||0) + l.total_hours
            }
          } else {
            workerMap[l.worker_id].iwsDays[day] = (workerMap[l.worker_id].iwsDays[day]||0) + l.total_hours
            if (!workerMap[l.worker_id].iwsLinesByDay[day]) workerMap[l.worker_id].iwsLinesByDay[day] = []
            workerMap[l.worker_id].iwsLinesByDay[day].push(l)
          }
        })
        // Also count non-internal lines as IWS if no internal source exists (IWS hours = all lines for that worker)
        // In practice: IWS hours are the "truth" from all sources combined
        allTsLines.forEach(l => {
          if (!workerMap[l.worker_id]) return
          const day = parseInt(l.work_date.split('-')[2])
          // Aggregate all lines as IWS hours (total for that worker/day)
          if (!workerMap[l.worker_id].iwsDays[day]) {
            workerMap[l.worker_id].iwsDays[day] = l.total_hours
            if (!workerMap[l.worker_id].iwsLinesByDay[day]) workerMap[l.worker_id].iwsLinesByDay[day] = []
            workerMap[l.worker_id].iwsLinesByDay[day].push(l)
          }
        })

        // Compute totals per worker
        const workerRows = Object.values(workerMap).filter(wr => {
          // Only show workers that have at least one timesheet line or are on payroll
          const hasTs = Object.keys(wr.iwsDays).length > 0 || Object.keys(wr.clientDays).length > 0
          const onPayroll = lines.some(l => l.worker_id === wr.worker.id)
          return hasTs || onPayroll
        }).map(wr => {
          const w = wr.worker
          const isFlat = w.category === 'Contract Worker' || w.category === 'Subcontract Worker'
          const baseRate = isFlat ? (w.hourly_rate||0) : (w.monthly_salary||0) / 30 / 8
          let totalHrs=0, normalHrs=0, ot1Hrs=0, ot2Hrs=0
          dayNums.forEach(d => {
            const hrs = wr.iwsDays[d] || 0
            if (hrs <= 0) return
            totalHrs += hrs
            const dateStr = monthStr+'-'+String(d).padStart(2,'0')
            const isFriday = new Date(dateStr).getDay() === 5
            const isHol = isPublicHoliday(dateStr) || isFriday
            if (isHol) { ot2Hrs += hrs }
            else { normalHrs += Math.min(hrs, otThreshold); ot1Hrs += Math.max(0, hrs - otThreshold) }
          })
          const ot1Pay = isFlat ? 0 : Math.round(ot1Hrs * baseRate * 1.25 * 100)/100
          const ot2Pay = isFlat ? Math.round(ot2Hrs * (w.hourly_rate||0) * 1.5 * 100)/100 : Math.round(ot2Hrs * baseRate * 1.5 * 100)/100
          const allowances = (w.housing_allowance||0)+(w.transport_allowance||0)+(w.food_allowance||0)+(w.fixed_allowance||0)
          const pl = lines.find(l => l.worker_id === w.id)
          const deductions = pl ? (pl.deductions_total||0)+(pl.advances_total||0) : 0
          const basicSalary = isFlat ? Math.round(totalHrs * (w.hourly_rate||0) * 100)/100 : (w.monthly_salary||0)
          const grossPay = isFlat ? basicSalary + ot2Pay + allowances : basicSalary + ot1Pay + ot2Pay + allowances
          const netPay = Math.round((grossPay - deductions) * 100)/100
          // Conflicts
          const conflicts = {}
          dayNums.forEach(d => {
            const clientH = wr.clientDays[d]
            const iwsH = wr.iwsDays[d]
            if (clientH !== undefined && iwsH !== undefined && Math.abs(clientH - iwsH) >= 0.5) {
              conflicts[d] = { client: clientH, iws: iwsH, diff: Math.round((clientH - iwsH)*10)/10 }
            }
          })
          return { ...wr, isFlat, baseRate: Math.round(baseRate*100)/100, totalHrs: Math.round(totalHrs*100)/100, normalHrs: Math.round(normalHrs*100)/100, ot1Hrs: Math.round(ot1Hrs*100)/100, ot2Hrs: Math.round(ot2Hrs*100)/100, ot1Pay, ot2Pay, allowances, deductions, basicSalary, grossPay: Math.round(grossPay*100)/100, netPay, conflicts, hasConflicts: Object.keys(conflicts).length > 0 }
        })

        // Day totals
        const dayTotals = {}
        dayNums.forEach(d => { dayTotals[d] = workerRows.reduce((s,wr) => s + (wr.iwsDays[d]||0), 0) })
        const grandTotalHrs = workerRows.reduce((s,r)=>s+r.totalHrs,0)
        const grandNormal = workerRows.reduce((s,r)=>s+r.normalHrs,0)
        const grandOt1 = workerRows.reduce((s,r)=>s+r.ot1Hrs,0)
        const grandOt2 = workerRows.reduce((s,r)=>s+r.ot2Hrs,0)
        const grandGross = workerRows.reduce((s,r)=>s+r.grossPay,0)

        const handleResolveConflict = (workerId, day, useClient) => {
          const wr = workerRows.find(r => r.worker.id === workerId)
          if (!wr) return
          const targetHrs = useClient ? wr.clientDays[day] : wr.iwsDays[day]
          const tsLines = wr.iwsLinesByDay[day] || []
          if (tsLines.length > 0) {
            const line = tsLines[0]
            const diff = targetHrs - line.total_hours
            updateTimesheetLine(line.id, {
              total_hours: targetHrs,
              normal_hours: Math.min(targetHrs, otThreshold),
              ot_hours: Math.max(0, targetHrs - otThreshold)
            })
          }
          setConflictPopover(null)
          setGridKey(k => k+1)
        }

        const totalConflicts = workerRows.reduce((s,r) => s + Object.keys(r.conflicts).length, 0)

        const printTimesheetGrid = () => {
          const printArea = document.getElementById('timesheet-print-area')
          if (!printArea) return
          document.body.style.overflow = 'hidden'
          document.body.classList.add('printing-timesheet')
          window.print()
          setTimeout(() => { document.body.classList.remove('printing-timesheet'); document.body.style.overflow = '' }, 1000)
        }

        return (
        <div className="panel" style={{marginTop:16}} id="timesheet-grid-section">
          {/* Print styles */}
          <style dangerouslySetInnerHTML={{__html:`
            @media print {
              @page { size: A3 landscape; margin: 10mm; }
              body.printing-timesheet * { visibility: hidden; }
              body.printing-timesheet #timesheet-print-area, body.printing-timesheet #timesheet-print-area * { visibility: visible; }
              body.printing-timesheet #timesheet-print-area { position: fixed; top: 0; left: 0; width: 100%; font-size: 8pt; background: white; }
              body.printing-timesheet th, body.printing-timesheet td { position: static !important; border: 0.5pt solid #ccc; padding: 2px 3px; white-space: nowrap; }
              body.printing-timesheet table { width: 100%; border-collapse: collapse; font-size: 7pt; }
              body.printing-timesheet #timesheet-print-area::before { content: "Innovation Technologies LLC O.P.C. — Monthly Timesheet"; display: block; font-size: 11pt; font-weight: bold; margin-bottom: 4mm; visibility: visible; }
              body.printing-timesheet #timesheet-print-area::after { content: "Licence: CN-5087790 | MOHRE: 1979124 | CONFIDENTIAL"; display: block; font-size: 7pt; color: #666; margin-top: 4mm; visibility: visible; }
            }
          `}} />
          <div className="panel-header">
            <div><h2>Monthly Timesheet & Payroll Review</h2><p>{monthLabel}</p></div>
          </div>

          {/* Toggle + Filters */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
            <div style={{display:'flex',gap:4,background:'var(--surface)',borderRadius:8,padding:3,border:'1px solid var(--border)'}}>
              <button className={`btn btn-sm ${gridViewMode==='daily'?'btn-teal':'btn-ghost'}`} onClick={()=>setGridViewMode('daily')}>Daily Grid View</button>
              <button className={`btn btn-sm ${gridViewMode==='summary'?'btn-teal':'btn-ghost'}`} onClick={()=>setGridViewMode('summary')}>Payroll Summary View</button>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {gridViewMode === 'daily' && (
                <>
                  <select className="filter-select" value={gridClient} onChange={e=>setGridClient(e.target.value)} style={{fontSize:12,minWidth:180}}>
                    <option value="all">All Clients</option>
                    {clients.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn btn-sm btn-secondary" onClick={printTimesheetGrid}>Print Timesheet</button>
                </>
              )}
              <span style={{fontSize:10,color:'var(--hint)',fontStyle:'italic'}}>Export (future)</span>
            </div>
          </div>

          {gridViewMode === 'daily' ? (
          /* ═══ DAILY GRID VIEW ═══ */
          workerRows.length === 0 ?
            <div style={{padding:'24px 0',textAlign:'center',color:'var(--hint)',fontSize:13}}>No timesheet lines found for this period. Upload a timesheet first.</div>
          :
          <div key={gridKey} id="timesheet-print-area" data-generated={new Date().toLocaleDateString('en-GB')} style={{overflowX:'auto',position:'relative'}}>
            <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'var(--surface)'}}>
                  <th style={{padding:'6px 8px',textAlign:'left',position:'sticky',left:0,background:'var(--surface)',zIndex:3,minWidth:160,borderRight:'2px solid var(--border)',fontSize:10,fontWeight:700}}>WORKER</th>
                  <th style={{padding:'6px 8px',textAlign:'left',position:'sticky',left:160,background:'var(--surface)',zIndex:3,minWidth:120,borderRight:'2px solid var(--border)',fontSize:10,fontWeight:600}}>TRADE</th>
                  {dayNums.map(d => {
                    const dateStr = monthStr+'-'+String(d).padStart(2,'0')
                    const dt = new Date(dateStr)
                    const dayAbbr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]
                    const isFri = dt.getDay() === 5
                    const isHol = isPublicHoliday(dateStr)
                    const bg = isHol ? '#fee2e2' : isFri ? '#fef3c7' : 'var(--surface)'
                    return <th key={d} style={{padding:'4px 2px',textAlign:'center',minWidth:38,fontSize:9,fontWeight:500,color:isHol?'#dc2626':isFri?'#92400e':'var(--muted)',background:bg}}>
                      <div>{d}</div><div>{isFri?'F':dayAbbr.slice(0,2)}</div>
                    </th>
                  })}
                  <th style={{padding:'6px 4px',textAlign:'center',borderLeft:'2px solid var(--border)',fontSize:10,fontWeight:700,background:'#eff6ff',minWidth:50}}>TOTAL</th>
                  <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:44}}>NORM</th>
                  <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:44,color:'#d97706'}}>OT1 1.25</th>
                  <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,minWidth:48,color:'#dc2626'}}>OT2 1.50</th>
                  <th style={{padding:'6px 4px',textAlign:'center',fontSize:10,fontWeight:700,minWidth:75,background:'#eff6ff',color:'var(--teal)'}}>GROSS</th>
                </tr>
              </thead>
              <tbody>
                {workerRows.map((wr, ri) => {
                  const hasClientData = Object.keys(wr.clientDays).length > 0
                  return (<React.Fragment key={'wr-'+wr.worker.id}>
                    {/* ROW A — Client Hours */}
                    {hasClientData && (
                    <tr style={{background:'#eff6ff',borderTop:'2px solid #e2e8f0'}}>
                      <td style={{padding:'5px 8px',position:'sticky',left:0,background:'#eff6ff',zIndex:2,borderRight:'2px solid var(--border)'}}>
                        <div style={{fontWeight:600,fontSize:11}}>{wr.worker.full_name}</div>
                        <div style={{fontSize:9,color:'var(--hint)'}}>{wr.worker.worker_number}</div>
                        <span style={{fontSize:9,fontWeight:600,background:'#dbeafe',color:'#1e40af',borderRadius:4,padding:'1px 5px',marginTop:2,display:'inline-block'}}>Client</span>
                      </td>
                      <td style={{padding:'5px 8px',position:'sticky',left:160,background:'#eff6ff',zIndex:2,borderRight:'2px solid var(--border)',fontSize:10,color:'var(--muted)'}}>{wr.worker.trade_role}</td>
                      {dayNums.map(d => {
                        const hrs = wr.clientDays[d]
                        return <td key={d} style={{padding:'3px 1px',textAlign:'center',fontSize:11,color:hrs?'#1e40af':'#cbd5e1',fontFamily:'monospace',fontWeight:hrs?500:400}}>{hrs !== undefined ? hrs : '—'}</td>
                      })}
                      <td style={{padding:'6px 4px',textAlign:'center',borderLeft:'2px solid var(--border)',fontWeight:600,fontSize:11,background:'#eff6ff',color:'#1e40af'}}>{Object.values(wr.clientDays).reduce((s,v)=>s+v,0)}</td>
                      <td colSpan={4}></td>
                    </tr>)}

                    {/* ROW B — IWS Hours */}
                    <tr style={{background:'#fff',borderTop:hasClientData?'none':'2px solid #e2e8f0'}}>
                      <td style={{padding:'5px 8px',position:'sticky',left:0,background:'#fff',zIndex:2,borderRight:'2px solid var(--border)'}}>
                        {!hasClientData && <>
                          <div style={{fontWeight:600,fontSize:11}}>{wr.worker.full_name}</div>
                          <div style={{fontSize:9,color:'var(--hint)'}}>{wr.worker.worker_number}</div>
                        </>}
                        <span style={{fontSize:9,fontWeight:600,background:'#f1f5f9',color:'#64748b',borderRadius:4,padding:'1px 5px',display:'inline-block',marginTop:hasClientData?0:2}}>IWS</span>
                      </td>
                      <td style={{padding:'5px 8px',position:'sticky',left:160,background:'#fff',zIndex:2,borderRight:'2px solid var(--border)',fontSize:10,color:'var(--muted)'}}>{!hasClientData ? wr.worker.trade_role : ''}</td>
                      {dayNums.map(d => {
                        const hrs = wr.iwsDays[d] || 0
                        const dateStr = monthStr+'-'+String(d).padStart(2,'0')
                        const isFri = new Date(dateStr).getDay() === 5
                        const isHol = isPublicHoliday(dateStr) || isFri
                        const bg = hrs <= 0 ? '#fafbfc' : isHol ? '#fef2f2' : hrs > 8 ? '#fffbeb' : '#fff'
                        const color = hrs <= 0 ? '#cbd5e1' : isHol ? '#dc2626' : hrs > 8 ? '#92400e' : '#166534'
                        return <td key={d} style={{padding:'3px 1px',textAlign:'center',background:bg,fontSize:11,fontWeight:hrs>8?700:hrs>0?500:400,color,fontFamily:'monospace'}}>{hrs>0?hrs:'—'}</td>
                      })}
                      <td style={{padding:'6px 4px',textAlign:'center',borderLeft:'2px solid var(--border)',fontWeight:700,fontSize:12,background:'#eff6ff',color:'var(--teal)'}}>{wr.totalHrs}</td>
                      <td style={{padding:'4px',textAlign:'center',fontSize:11}}>{wr.normalHrs}</td>
                      <td style={{padding:'4px',textAlign:'center',fontSize:11,color:wr.ot1Hrs>0?'#d97706':'var(--hint)',fontWeight:wr.ot1Hrs>0?600:400}}>{wr.ot1Hrs}</td>
                      <td style={{padding:'4px',textAlign:'center',fontSize:11,color:wr.ot2Hrs>0?'#dc2626':'var(--hint)',fontWeight:wr.ot2Hrs>0?600:400}}>{wr.ot2Hrs}</td>
                      <td style={{padding:'6px 4px',textAlign:'center',fontWeight:700,fontSize:12,background:'#eff6ff',color:'var(--teal)'}}>{formatCurrency(wr.grossPay)}</td>
                    </tr>

                    {/* ROW C — Conflict Row */}
                    {wr.hasConflicts && (
                    <tr style={{background:'#fff'}}>
                      <td style={{padding:'3px 8px',position:'sticky',left:0,background:'#fff',zIndex:2,borderRight:'2px solid var(--border)'}}>
                        <span style={{fontSize:10,fontWeight:700,color:'#dc2626'}}>&#9888;</span>
                      </td>
                      <td style={{position:'sticky',left:160,background:'#fff',zIndex:2,borderRight:'2px solid var(--border)'}}></td>
                      {dayNums.map(d => {
                        const c = wr.conflicts[d]
                        if (!c) return <td key={d} style={{padding:'3px 1px'}}></td>
                        const isActive = conflictPopover?.workerId === wr.worker.id && conflictPopover?.day === d
                        return <td key={d} style={{padding:'2px 1px',textAlign:'center',position:'relative'}}>
                          <div onClick={() => setConflictPopover(isActive ? null : {workerId:wr.worker.id,day:d})} style={{background:'#fee2e2',color:'#dc2626',borderRadius:4,padding:'1px 2px',fontSize:10,fontWeight:700,cursor:'pointer'}}>{c.diff > 0 ? '+' : ''}{c.diff}</div>
                          {isActive && (
                            <div style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',zIndex:10,background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:10,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',width:200,textAlign:'left'}} onClick={e=>e.stopPropagation()}>
                              <div style={{fontSize:10,marginBottom:6}}>
                                <div>Client says: <strong>{c.client}h</strong></div>
                                <div>IWS says: <strong>{c.iws}h</strong></div>
                                <div style={{color:'#dc2626',fontWeight:600}}>Difference: {c.diff > 0 ? '+' : ''}{c.diff}h</div>
                              </div>
                              <div style={{display:'flex',gap:4}}>
                                <button className="btn btn-sm" style={{flex:1,fontSize:9,background:'#dbeafe',color:'#1e40af',border:'none',padding:'4px 6px'}} onClick={()=>handleResolveConflict(wr.worker.id,d,true)}>Use Client</button>
                                <button className="btn btn-sm" style={{flex:1,fontSize:9,background:'#f1f5f9',color:'#334155',border:'none',padding:'4px 6px'}} onClick={()=>handleResolveConflict(wr.worker.id,d,false)}>Use IWS</button>
                              </div>
                            </div>
                          )}
                        </td>
                      })}
                      <td colSpan={5}></td>
                    </tr>)}
                  </React.Fragment>)
                })}

                {/* TOTALS ROW */}
                <tr style={{background:'#0d9488',color:'#fff',fontWeight:700,position:'sticky',bottom:0,zIndex:3}}>
                  <td style={{padding:'8px',position:'sticky',left:0,background:'#0d9488',zIndex:4,borderRight:'2px solid #0f766e',fontSize:11}}>TOTALS</td>
                  <td style={{padding:'8px',position:'sticky',left:160,background:'#0d9488',zIndex:4,borderRight:'2px solid #0f766e'}}></td>
                  {dayNums.map(d => <td key={d} style={{padding:'4px 1px',textAlign:'center',fontSize:10,fontFamily:'monospace'}}>{dayTotals[d]>0?Math.round(dayTotals[d]*10)/10:'—'}</td>)}
                  <td style={{padding:'6px 4px',textAlign:'center',borderLeft:'2px solid #0f766e',fontSize:12}}>{Math.round(grandTotalHrs*10)/10}</td>
                  <td style={{padding:'4px',textAlign:'center',fontSize:11}}>{Math.round(grandNormal*10)/10}</td>
                  <td style={{padding:'4px',textAlign:'center',fontSize:11}}>{Math.round(grandOt1*10)/10}</td>
                  <td style={{padding:'4px',textAlign:'center',fontSize:11}}>{Math.round(grandOt2*10)/10}</td>
                  <td style={{padding:'6px 4px',textAlign:'center',fontSize:12}}>{formatCurrency(grandGross)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ) : (
          /* ═══ PAYROLL SUMMARY VIEW ═══ */
          <div>
          {/* Conflict alert banner */}
          {totalConflicts > 0 ? (
            <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'10px 16px',marginBottom:14,fontSize:12,color:'#dc2626',fontWeight:600}}>
              &#9888; {totalConflicts} unresolved timesheet conflict{totalConflicts!==1?'s':''} — resolve in Daily Grid View before approving payroll
            </div>
          ) : (
            <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'10px 16px',marginBottom:14,fontSize:12,color:'#16a34a',fontWeight:600}}>
              &#10003; All timesheet hours reconciled — ready for payroll approval
            </div>
          )}
          {workerRows.length === 0 ? (
            <div style={{padding:'24px 0',textAlign:'center',color:'var(--hint)',fontSize:13}}>No timesheet lines found for this period. Upload a timesheet first.</div>
          ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Worker</th><th>Trade</th><th>Category</th>
                <th>Total Hrs</th><th>Normal Hrs</th><th style={{color:'#d97706'}}>OT1 Hrs</th><th style={{color:'#dc2626'}}>OT2/Hol Hrs</th>
                <th>Basic Salary</th><th style={{color:'#d97706'}}>OT1 Pay</th><th style={{color:'#dc2626'}}>OT2 Pay</th>
                <th>Allowances</th><th>Deductions</th><th style={{color:'var(--teal)'}}>NET PAY</th>
              </tr></thead>
              <tbody>
                {workerRows.map((wr, i) => (
                  <tr key={i}>
                    <td style={{fontWeight:500,fontSize:12}}>{wr.worker.full_name}<div style={{fontSize:10,color:'var(--hint)'}}>{wr.worker.worker_number}</div></td>
                    <td style={{fontSize:11}}>{wr.worker.trade_role}</td>
                    <td><StatusBadge label={wr.worker.category} tone="neutral" /></td>
                    <td style={{fontSize:12,fontWeight:600}}>{wr.totalHrs}h</td>
                    <td style={{fontSize:11}}>{wr.normalHrs}h</td>
                    <td style={{fontSize:11,color:wr.ot1Hrs>0?'#d97706':'var(--hint)',fontWeight:wr.ot1Hrs>0?600:400}}>{wr.ot1Hrs}h</td>
                    <td style={{fontSize:11,color:wr.ot2Hrs>0?'#dc2626':'var(--hint)',fontWeight:wr.ot2Hrs>0?600:400}}>{wr.ot2Hrs}h</td>
                    <td style={{fontSize:11}}>{formatCurrency(wr.basicSalary)}</td>
                    <td style={{fontSize:11,color:wr.ot1Pay>0?'#d97706':'var(--hint)'}}>{wr.ot1Pay>0?formatCurrency(wr.ot1Pay):'—'}</td>
                    <td style={{fontSize:11,color:wr.ot2Pay>0?'#dc2626':'var(--hint)'}}>{wr.ot2Pay>0?formatCurrency(wr.ot2Pay):'—'}</td>
                    <td style={{fontSize:11,color:'var(--success)'}}>{formatCurrency(wr.allowances)}</td>
                    <td style={{fontSize:11,color:wr.deductions>0?'var(--danger)':'var(--hint)'}}>{wr.deductions>0?formatCurrency(wr.deductions):'—'}</td>
                    <td style={{fontSize:13,fontWeight:700,color:'var(--teal)'}}>{formatCurrency(wr.netPay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'var(--surface)',fontWeight:700}}>
                  <td colSpan={3} style={{fontSize:12}}>TOTALS</td>
                  <td style={{fontSize:12}}>{Math.round(grandTotalHrs*10)/10}h</td>
                  <td style={{fontSize:11}}>{Math.round(grandNormal*10)/10}h</td>
                  <td style={{fontSize:11,color:'#d97706'}}>{Math.round(grandOt1*10)/10}h</td>
                  <td style={{fontSize:11,color:'#dc2626'}}>{Math.round(grandOt2*10)/10}h</td>
                  <td style={{fontSize:11}}>{formatCurrency(workerRows.reduce((s,r)=>s+r.basicSalary,0))}</td>
                  <td style={{fontSize:11,color:'#d97706'}}>{formatCurrency(workerRows.reduce((s,r)=>s+r.ot1Pay,0))}</td>
                  <td style={{fontSize:11,color:'#dc2626'}}>{formatCurrency(workerRows.reduce((s,r)=>s+r.ot2Pay,0))}</td>
                  <td style={{fontSize:11,color:'var(--success)'}}>{formatCurrency(workerRows.reduce((s,r)=>s+r.allowances,0))}</td>
                  <td style={{fontSize:11,color:'var(--danger)'}}>{formatCurrency(workerRows.reduce((s,r)=>s+r.deductions,0))}</td>
                  <td style={{fontSize:13,color:'var(--teal)'}}>{formatCurrency(workerRows.reduce((s,r)=>s+r.netPay,0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          )}
          </div>
          )}
        </div>)
      })()}

      {/* Unlock Modal */}
      {showUnlock && (
        <div className="drawer-backdrop" onClick={() => setShowUnlock(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:24,width:'min(420px,90vw)',margin:'auto',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>🔓 Unlock Payroll — Management Authorization</h3>
            <div className="notice warning" style={{marginBottom:12,fontSize:12}}>Unlocking will reset all approvals. Operations and Owner must re-approve after modifications.</div>
            <label className="form-label">Reason for unlocking *</label>
            <textarea className="form-textarea" value={unlockReason} onChange={e => setUnlockReason(e.target.value)} placeholder="Explain why this payroll needs to be unlocked..." rows={4} />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-secondary" onClick={() => { setShowUnlock(false); setUnlockReason('') }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleUnlock}>Confirm Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Note Modal */}
      {showCorrection && (
        <div className="drawer-backdrop" onClick={() => setShowCorrection(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:24,width:'min(420px,90vw)',margin:'auto',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>Add Correction Note</h3>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Document errors for reference when processing next month&apos;s payroll.</p>
            <label className="form-label">Correction note *</label>
            <textarea className="form-textarea" value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} placeholder="Describe the issue and how it will be corrected..." rows={4} />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-secondary" onClick={() => { setShowCorrection(false); setCorrectionNote('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCorrection}>Add Note</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
    {payslipViewer && <LetterViewer html={payslipViewer.html} refNumber={payslipViewer.ref} onClose={() => setPayslipViewer(null)} />}
    </>
  )
}

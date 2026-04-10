'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getAllPayrollBatches, getPayrollBatchByMonth, getPayrollLinesByBatch, canEditPayrollBatch, unlockPayrollBatch, addCorrectionNote, getPayrollBatch, getPayrollLines, updatePayrollBatch, addPayrollAdjustment, getPenaltyDeductions, confirmPenaltyDeduction, removePenaltyDeduction, getRamadanMode, getWorkers, getTimesheetHeaders, getTimesheetLines, isPublicHoliday, getPublicHolidays } from '../../lib/mockStore'
import { formatCurrency, getStatusTone } from '../../lib/utils'
import { canAccess, getRole } from '../../lib/mockAuth'

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
    setOfficeStaff(getWorkers().filter(w => w.category === 'Office Staff' && w.active !== false))
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
    unlockPayrollBatch(batch.id, 'Owner', unlockReason)
    setShowUnlock(false); setUnlockReason('')
    setAllBatches(getAllPayrollBatches()); loadBatch(selectedMonth)
  }

  const handleAddCorrection = () => {
    if (!correctionNote.trim()) return
    addCorrectionNote(batch.id, correctionNote, role === 'owner' ? 'Owner' : 'HR Admin')
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

  return (
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
                <button className="btn btn-danger" onClick={() => setShowUnlock(true)}>🔓 Unlock (Owner Only)</button>
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

      {/* Timesheet Payroll Preview */}
      {timesheetPayroll && (
        <div className="panel" style={{marginBottom:16,border:'2px solid var(--teal-border)',background:'var(--teal-bg)'}}>
          <div className="panel-header"><div><h2>📊 Payroll from Timesheet — {timesheetPayroll.month} {timesheetPayroll.year}</h2><p>Client: {timesheetPayroll.client} · {timesheetPayroll.workers?.length || 0} workers</p></div><button className="btn btn-ghost btn-sm" onClick={() => setTimesheetPayroll(null)}>✕ Dismiss</button></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Worker</th><th>Total Hrs</th><th>Regular</th><th>OT</th><th>Holiday</th><th>Basic</th><th>OT Pay</th><th>Holiday Pay</th><th>Allowances</th><th>ILOE</th><th>Net Pay</th></tr></thead>
            <tbody>{(timesheetPayroll.workers||[]).map((w, i) => {
              const worker = getWorkers().find(wk => wk.id === w.worker_id)
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
            {[['all','All'],['direct','Direct'],['hourly','Hourly'],['sub','Sub'],['office','Office'],['timesheet_review','📋 Timesheet Review']].map(([key,label]) => (
              <button key={key} className={`tab${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          {tab !== 'timesheet_review' ? (
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
            const allWorkers = getWorkers()
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
          </div>
        )}
      </div>

      {!canEdit && batch.locked && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'12px 16px',marginTop:16,fontSize:12,color:'#92400e'}}>
          <strong>Note:</strong> This payroll is locked. To correct errors, add a correction note and adjust in the following month&apos;s payroll.
        </div>
      )}

      {/* Payroll Verification Panel */}
      {lines.length > 0 && (
        <div className="panel" style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <button className="btn btn-ghost" onClick={() => setShowVerification(!showVerification)} style={{fontSize:13,fontWeight:600}}>
              🔍 {showVerification ? 'Hide' : 'Show'} Verification Breakdown
            </button>
            {showVerification && <div style={{fontSize:10,color:'var(--hint)',fontStyle:'italic'}}>Rule: salary ÷ 30 ÷ 8 = base rate. Weekday OT ×1.25, Holiday OT ×1.50</div>}
          </div>
          {showVerification && (() => {
            const allW = getWorkers()
            const verRows = lines.map(l => {
              const worker = allW.find(w => w.id === l.worker_id)
              const isFlat = worker && (worker.category === 'Contract Worker' || worker.category === 'Subcontract Worker')
              const basic = worker?.monthly_salary || 0
              const rate = isFlat ? (worker?.hourly_rate||0) : basic / 30 / 8
              const otPay = isFlat ? 0 : Math.round((l.ot_hours||0) * rate * 1.25 * 100) / 100
              const holPay = Math.round((l.holiday_hours||0) * rate * 1.50 * 100) / 100
              const allowances = (l.allowances_total||0)
              const deductions = (l.deductions_total||0) + (l.advances_total||0)
              const expectedNet = Math.round((basic + allowances + otPay + holPay - deductions) * 100) / 100
              const actualNet = l.net_pay || 0
              const diff = Math.round((actualNet - expectedNet) * 100) / 100
              const match = Math.abs(diff) < 1
              return { l, worker, isFlat, basic, rate:Math.round(rate*100)/100, otPay, holPay, allowances, deductions, expectedNet, actualNet, diff, match }
            })
            const totalGross = verRows.reduce((s,r) => s + r.basic + r.allowances + r.otPay + r.holPay, 0)
            const totalDeductions = verRows.reduce((s,r) => s + r.deductions, 0)
            const totalNet = verRows.reduce((s,r) => s + r.expectedNet, 0)
            const mismatchCount = verRows.filter(r => !r.match).length
            return (<div style={{marginTop:12}}>
              <div className="table-wrap"><table>
                <thead><tr><th>Worker</th><th>Basic</th><th>÷30÷8 Rate</th><th>Normal Hrs</th><th>OT Hrs (×1.25)</th><th>Holiday Hrs (×1.50)</th><th>OT Pay</th><th>Holiday Pay</th><th>Allowances</th><th>Deductions</th><th>Net Pay</th><th>Check</th></tr></thead>
                <tbody>
                  {verRows.map((r, i) => (
                    <tr key={i} style={{background:r.match?'':'#fef2f2'}}>
                      <td style={{fontWeight:500,fontSize:12}}>{r.l.worker_name}<div style={{fontSize:10,color:'var(--hint)'}}>{r.l.worker_number}</div></td>
                      <td style={{fontSize:11}}>{formatCurrency(r.basic)}</td>
                      <td style={{fontSize:11,fontFamily:'monospace'}}>{r.rate}</td>
                      <td style={{fontSize:11}}>{r.l.normal_hours||0}h</td>
                      <td style={{fontSize:11,color:r.l.ot_hours>0?'var(--warning)':'var(--hint)'}}>{r.l.ot_hours||0}h</td>
                      <td style={{fontSize:11,color:r.l.holiday_hours>0?'var(--danger)':'var(--hint)'}}>{r.l.holiday_hours||0}h</td>
                      <td style={{fontSize:11,color:'var(--success)'}}>{r.otPay>0?formatCurrency(r.otPay):'—'}</td>
                      <td style={{fontSize:11,color:'var(--danger)'}}>{r.holPay>0?formatCurrency(r.holPay):'—'}</td>
                      <td style={{fontSize:11}}>{formatCurrency(r.allowances)}</td>
                      <td style={{fontSize:11,color:'var(--danger)'}}>{r.deductions>0?formatCurrency(r.deductions):'—'}</td>
                      <td style={{fontSize:12,fontWeight:600,color:'var(--teal)'}}>{formatCurrency(r.expectedNet)}</td>
                      <td style={{textAlign:'center'}}>
                        {r.match
                          ? <span style={{color:'var(--success)',fontWeight:700}}>✓</span>
                          : <span style={{color:'var(--danger)',fontWeight:700}}>✗ <span style={{fontSize:10}}>{r.diff>0?'+':''}{formatCurrency(r.diff)}</span></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:12}}>
                <div className="stat-card"><div className="num teal" style={{fontSize:16}}>{formatCurrency(totalGross)}</div><div className="lbl">Total gross</div></div>
                <div className="stat-card"><div className="num danger" style={{fontSize:16}}>{formatCurrency(totalDeductions)}</div><div className="lbl">Total deductions</div></div>
                <div className="stat-card"><div className="num success" style={{fontSize:16}}>{formatCurrency(totalNet)}</div><div className="lbl">Total net (calculated)</div></div>
                <div className="stat-card"><div className={`num ${mismatchCount>0?'danger':'success'}`} style={{fontSize:16}}>{mismatchCount === 0 ? '✓ All match' : mismatchCount + ' mismatch'+(mismatchCount>1?'es':'')}</div><div className="lbl">Verification status</div></div>
              </div>
            </div>)
          })()}
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlock && (
        <div className="drawer-backdrop" onClick={() => setShowUnlock(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:24,width:'min(420px,90vw)',margin:'auto',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>🔓 Unlock Payroll — Owner Authorization</h3>
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
  )
}

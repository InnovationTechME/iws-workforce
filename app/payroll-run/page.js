'use client'
import React, { useState, useEffect, useCallback } from 'react'
import AppShell from '../../components/AppShell'
import StatusBadge from '../../components/StatusBadge'
import {
  getPayrollBatches, getPayrollLines, updatePayrollBatch,
  generatePayrollBatch, deletePayrollBatch, getPayrollBatchByMonthYear,
  addPayrollAdjustment, getAdjustmentsByBatch,
  approvePayrollBatchOps, rejectPayrollBatchOps,
  approvePayrollBatchOwner, rejectPayrollBatchOwner
} from '../../lib/payrollService'
import { getTimesheetHeaders, getTimesheetLinesByMonth } from '../../lib/timesheetService'
import { getVisibleWorkers } from '../../lib/workerService'
import { getPublicHolidaysByYear } from '../../lib/publicHolidayService'
import { getRole } from '../../lib/mockAuth'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const InstructionBanner = ({ step, title, roleLabel, description, howTo }) => (
  <div style={{background:'linear-gradient(135deg,#eff6ff,#f0fdfa)',border:'1px solid #bae6fd',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:'#0891b2',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Step {step}</div>
        <div style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>{title}</div>
      </div>
      <span style={{background:'#e0f2fe',color:'#0369a1',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{roleLabel}</span>
    </div>
    <p style={{fontSize:13,color:'#334155',margin:'0 0 10px 0',lineHeight:1.6}}>{description}</p>
    <div style={{borderTop:'1px solid #bae6fd',paddingTop:10}}>
      <div style={{fontSize:11,fontWeight:600,color:'#0891b2',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>How to use this step:</div>
      <ul style={{margin:0,padding:'0 0 0 16px'}}>{howTo.map((item,i) => <li key={i} style={{fontSize:12,color:'#475569',marginBottom:3,lineHeight:1.5}}>{item}</li>)}</ul>
    </div>
  </div>
)

export default function PayrollRunPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [stepStatus, setStepStatus] = useState({1:'active',2:'locked',3:'locked',4:'locked',5:'locked'})
  const [allBatches, setAllBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [payrollLines, setPayrollLines] = useState([])
  const [timesheetHeaders, setTimesheetHeaders] = useState([])
  const [selectedHeader, setSelectedHeader] = useState(null)
  const [allLines, setAllLines] = useState([])
  const [workers, setWorkers] = useState([])
  const [holidays, setHolidays] = useState([])
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState('all')
  const [step1Confirmed, setStep1Confirmed] = useState(false)
  const [role, setRoleState] = useState('owner')
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [expandedWorker, setExpandedWorker] = useState(null)
  const [adjForm, setAdjForm] = useState({worker_id:'',type:'deduction',label:'',amount:''})
  const [showAdjPanel, setShowAdjPanel] = useState(false)
  const [step2Confirmed, setStep2Confirmed] = useState(false)
  const [payrollAdjustments, setPayrollAdjustments] = useState([])
  const [step3Approved, setStep3Approved] = useState(false)
  const [opsRejected, setOpsRejected] = useState(false)
  const [opsRejectionNote, setOpsRejectionNote] = useState('')
  const [showOpsRejectModal, setShowOpsRejectModal] = useState(false)
  const [opsRejectDraft, setOpsRejectDraft] = useState('')
  const [flaggedWorkers, setFlaggedWorkers] = useState({})
  const [flagNote, setFlagNote] = useState('')
  const [flaggingWorker, setFlaggingWorker] = useState(null)
  const [step4Approved, setStep4Approved] = useState(false)
  const [ownerRejected, setOwnerRejected] = useState(false)
  const [ownerRejectionNote, setOwnerRejectionNote] = useState('')
  const [showOwnerRejectModal, setShowOwnerRejectModal] = useState(false)
  const [ownerRejectDraft, setOwnerRejectDraft] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalChecklist, setApprovalChecklist] = useState({conflicts:false,penalties:false,opsApproved:false,carryOver:false,wpsReviewed:false})
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  // Generate payroll RPC state
  const [rpcLoading, setRpcLoading] = useState(false)
  // Delete draft state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [pdfWorker, setPdfWorker] = useState(null)
  // Selected month/year for batch generation
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 5000) }

  const isHoliday = useCallback((dateStr) => holidays.some(h => h.date === dateStr), [holidays])
  const getHolidayName = useCallback((dateStr) => holidays.find(h => h.date === dateStr)?.name || '', [holidays])

  // Load batch payroll lines
  const loadBatchData = useCallback(async (batch) => {
    if (!batch) return
    try {
      const lines = await getPayrollLines(batch.id)
      setPayrollLines(lines)
      const adjs = await getAdjustmentsByBatch(batch.id)
      setPayrollAdjustments(adjs)
      // Restore step state from batch status
      if (batch.status === 'calculated' || batch.status === 'ops_approved' || batch.status === 'owner_approved' || batch.status === 'locked') {
        setStep1Confirmed(true)
        setStepStatus(prev => ({...prev, 1:'complete', 2:'complete'}))
        setStep2Confirmed(true)
      }
      // calculated + ops pending → Step 3
      if (batch.status === 'calculated' && batch.ops_approval_status === 'pending') {
        setStepStatus(prev => ({...prev, 2:'complete', 3:'active'}))
      }
      // calculated + ops rejected → Step 2 with rejection banner
      if (batch.status === 'calculated' && batch.ops_approval_status === 'rejected') {
        setOpsRejected(true)
        setOpsRejectionNote(batch.ops_rejection_reason || '')
        setStepStatus(prev => ({...prev, 2:'active', 3:'error'}))
      }
      // ops_approved + owner pending → Step 4
      if (batch.status === 'ops_approved' && batch.owner_approval_status === 'pending') {
        setStep3Approved(true)
        setStepStatus(prev => ({...prev, 3:'complete', 4:'active'}))
      }
      // owner_approved + owner pending (post-unlock) → Step 4
      if (batch.status === 'owner_approved' && batch.owner_approval_status === 'pending') {
        setStep3Approved(true)
        setStepStatus(prev => ({...prev, 3:'complete', 4:'active'}))
      }
      // ops_approved + owner rejected → Step 4 with rejection banner
      if (batch.status === 'ops_approved' && batch.owner_approval_status === 'rejected') {
        setStep3Approved(true)
        setOwnerRejected(true)
        setOwnerRejectionNote(batch.owner_rejection_reason || '')
        setStepStatus(prev => ({...prev, 3:'complete', 4:'error'}))
      }
      // locked → Step 5
      if (batch.status === 'locked') {
        setStep3Approved(true)
        setStep4Approved(true)
        setStepStatus(prev => ({...prev, 3:'complete', 4:'complete', 5:'active'}))
      }
    } catch (err) {
      console.error('loadBatchData error:', err)
      showError('Failed to load batch data')
    }
  }, [])

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        setRoleState(getRole())
        const [ws, hdrs, batches] = await Promise.all([
          getVisibleWorkers(),
          getTimesheetHeaders(),
          getPayrollBatches()
        ])
        setWorkers(ws.filter(w => w.status === 'active'))
        setTimesheetHeaders(hdrs)
        if (hdrs.length > 0) setSelectedHeader(hdrs[0])
        setAllBatches(batches)

        // Determine the working month/year from timesheets or latest batch
        let workMonth, workYear
        if (hdrs.length > 0) {
          workMonth = hdrs[0].month
          workYear = hdrs[0].year
        } else if (batches.length > 0) {
          workMonth = batches[0].month
          workYear = batches[0].year
        } else {
          const now = new Date()
          workMonth = now.getMonth() + 1
          workYear = now.getFullYear()
        }
        setSelectedMonth(workMonth)
        setSelectedYear(workYear)

        // Load holidays and timesheet lines for the working year/month
        const [hols, tsLines] = await Promise.all([
          getPublicHolidaysByYear(workYear),
          getTimesheetLinesByMonth(workMonth, workYear)
        ])
        setHolidays(hols)
        setAllLines(tsLines)

        // Load existing batch if any
        const existingBatch = batches.find(b => b.month === workMonth && b.year === workYear)
        if (existingBatch) {
          setSelectedBatch(existingBatch)
          await loadBatchData(existingBatch)
        }
      } catch (err) {
        console.error('Init error:', err)
        showError('Failed to load data: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadBatchData])

  // Handle switching batch period
  const handlePeriodChange = async (monthYear) => {
    const [m, y] = monthYear.split('-').map(Number)
    setSelectedMonth(m)
    setSelectedYear(y)
    setStep1Confirmed(false)
    setStep2Confirmed(false)
    setStep3Approved(false)
    setStep4Approved(false)
    setOpsRejected(false)
    setOpsRejectionNote('')
    setOwnerRejected(false)
    setOwnerRejectionNote('')
    setCurrentStep(1)
    setStepStatus({1:'active',2:'locked',3:'locked',4:'locked',5:'locked'})
    setPayrollLines([])
    setSelectedBatch(null)

    try {
      const [tsLines, hdrs, hols] = await Promise.all([
        getTimesheetLinesByMonth(m, y),
        getTimesheetHeaders(),
        getPublicHolidaysByYear(y)
      ])
      setAllLines(tsLines)
      setTimesheetHeaders(hdrs.filter(h => h.month === m && h.year === y))
      setHolidays(hols)

      const batch = allBatches.find(b => b.month === m && b.year === y)
      if (batch) {
        setSelectedBatch(batch)
        await loadBatchData(batch)
      }
    } catch (err) {
      console.error('Period change error:', err)
      showError('Failed to load period data')
    }
  }

  // Generate payroll via RPC
  const handleGeneratePayroll = async () => {
    if (!selectedMonth || !selectedYear) return
    setRpcLoading(true)
    setErrorMsg(null)
    try {
      const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
      const batchId = await generatePayrollBatch(selectedMonth, selectedYear, monthLabel)
      const [batches, batch, lines] = await Promise.all([
        getPayrollBatches(),
        getPayrollBatchByMonthYear(selectedMonth, selectedYear),
        (async () => { /* wait a tick for batch to exist */ return [] })()
      ])
      setAllBatches(batches)
      if (batch) {
        setSelectedBatch(batch)
        const pl = await getPayrollLines(batch.id)
        setPayrollLines(pl)
        setStep1Confirmed(true)
        setStepStatus(prev => ({...prev, 1:'complete', 2:'active'}))
        setCurrentStep(2)
      }
      showSuccess(`Payroll generated for ${monthLabel} — ${batchId ? 'batch created' : 'done'}`)
    } catch (err) {
      console.error('Generate payroll error:', err)
      showError(err.message || 'Failed to generate payroll')
    } finally {
      setRpcLoading(false)
    }
  }

  // Delete draft batch
  const handleDeleteBatch = async () => {
    if (!selectedBatch) return
    const expectedText = `${MONTH_NAMES[selectedMonth - 1]}-${selectedYear}`.toUpperCase()
    if (deleteConfirmText.trim().toUpperCase() !== expectedText) {
      showError(`Type ${expectedText} to confirm deletion`)
      return
    }
    setDeleting(true)
    try {
      await deletePayrollBatch(selectedBatch.id)
      const batches = await getPayrollBatches()
      setAllBatches(batches)
      setSelectedBatch(null)
      setPayrollLines([])
      setStep1Confirmed(false)
      setStep2Confirmed(false)
      setCurrentStep(1)
      setStepStatus({1:'active',2:'locked',3:'locked',4:'locked',5:'locked'})
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
      showSuccess('Draft batch deleted — you can re-generate')
    } catch (err) {
      showError(err.message || 'Failed to delete batch')
    } finally {
      setDeleting(false)
    }
  }

  // Compute totals from persisted payroll_lines (no JS-side math)
  const computeTotals = useCallback(() => {
    const totalGross = payrollLines.reduce((s, l) => s + Number(l.gross_pay || 0), 0)
    const totalDeductions = payrollLines.reduce((s, l) => s + Number(l.deductions_total || 0), 0)
    const totalNet = payrollLines.reduce((s, l) => s + Number(l.net_pay || 0), 0)
    const wpsTotal = payrollLines.filter(l => l.payment_method === 'WPS' || !l.payment_method).reduce((s, l) => s + Number(l.net_pay || 0), 0)
    const nonWpsTotal = payrollLines.filter(l => l.payment_method === 'Non-WPS').reduce((s, l) => s + Number(l.net_pay || 0), 0)
    const cashTotal = payrollLines.filter(l => l.payment_method === 'Cash').reduce((s, l) => s + Number(l.net_pay || 0), 0)
    return { totalGross, totalDeductions, totalNet, wpsTotal, nonWpsTotal, cashTotal, workerCount: payrollLines.length }
  }, [payrollLines])

  const steps = [
    {number:1,title:'Timesheet Review',subtitle:'Verify hours & resolve conflicts',icon:'📋'},
    {number:2,title:'Payroll Calculation',subtitle:'Review earnings & deductions',icon:'💰'},
    {number:3,title:'Operations Approval',subtitle:'Operations confirms hours',icon:'🏗'},
    {number:4,title:'Management Approval',subtitle:'Final sign-off',icon:'✅'},
    {number:5,title:'Run & Distribute',subtitle:'Generate files & payslips',icon:'⚡'}
  ]

  const completedCount = Object.values(stepStatus).filter(s => s === 'complete').length

  // ── Step 1: Timesheet Review ──
  const Step1TimesheetReview = () => {
    if (!selectedMonth || !selectedYear) return null
    const monthIndex = selectedMonth - 1
    const yearNum = selectedYear
    const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate()

    const dayMeta = Array.from({length:daysInMonth},(_,i) => {
      const day = i+1
      const dateStr = `${yearNum}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const dateObj = new Date(yearNum, monthIndex, day)
      const dayOfWeek = dateObj.getDay()
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      return {day,dateStr,dayOfWeek,dayName:dayNames[dayOfWeek],isFriday:dayOfWeek===5,isSunday:dayOfWeek===0,isHoliday:isHoliday(dateStr),holidayName:isHoliday(dateStr)?getHolidayName(dateStr):null}
    })

    const filteredWorkers = selectedWorkerFilter === 'all'
      ? workers.filter(w => w.category !== 'Office Staff')
      : workers.filter(w => w.id === selectedWorkerFilter)

    const getIWSHours = (wId, dateStr) => { const l = allLines.find(l => l.worker_id === wId && l.work_date === dateStr); return l ? Number(l.total_hours||0) : null }

    const monthHeaders = timesheetHeaders.filter(h => h.month === selectedMonth && h.year === selectedYear)

    if (monthHeaders.length === 0) {
      return (<div className="panel" style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:48,marginBottom:12}}>📋</div>
        <h3>No timesheets uploaded for this period</h3>
        <p style={{color:'var(--muted)',marginBottom:16}}>Upload a client timesheet first before running payroll.</p>
        <a href="/timesheets" className="btn btn-primary">Go to Timesheets →</a>
      </div>)
    }

    return (<div>
      <InstructionBanner step={1} title="Timesheet Review" roleLabel="HR Admin"
        description="Review all worker hours for this pay period. Verify the hours are correct before generating payroll."
        howTo={['Each worker row shows their daily hours for the month','Friday columns are highlighted amber — these attract 1.50× premium for salaried staff','Red column headers indicate UAE public holidays','Use the Print button at any time to print the full timesheet','Select a single worker from the dropdown to review individually','When satisfied, click Confirm & Generate Payroll']} />

      {/* Filters */}
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <label style={{fontSize:12,color:'#64748b',fontWeight:600}}>Timesheet:</label>
          <select className="filter-select" value={selectedHeader?.id||''} onChange={e => { const h = timesheetHeaders.find(x => x.id === e.target.value); setSelectedHeader(h) }}>
            {monthHeaders.map(h => <option key={h.id} value={h.id}>{h.client_name} — {h.month_label}</option>)}
          </select>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <label style={{fontSize:12,color:'#64748b',fontWeight:600}}>Worker:</label>
          <select className="filter-select" value={selectedWorkerFilter} onChange={e => setSelectedWorkerFilter(e.target.value)}>
            <option value="all">All Workers</option>
            {workers.filter(w => w.category !== 'Office Staff').map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}
          </select>
        </div>
        <div style={{flex:1}} />
        <button className="btn btn-secondary btn-sm" onClick={() => { document.body.classList.add('printing-timesheet'); window.print(); setTimeout(() => document.body.classList.remove('printing-timesheet'), 1200) }}>🖨 Print All</button>
      </div>

      {/* All clear banner */}
      <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:8,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:20}}>✓</span>
        <div><div style={{fontWeight:600,color:'#16a34a',fontSize:13}}>Timesheets loaded from Supabase</div><div style={{fontSize:12,color:'#15803d'}}>{allLines.length} timesheet lines across {monthHeaders.length} header(s)</div></div>
      </div>

      {/* Grid */}
      <div id="timesheet-print-area" style={{overflowX:'auto',border:'1px solid #e2e8f0',borderRadius:8,background:'white',marginBottom:20}}>
        <table style={{borderCollapse:'collapse',minWidth:'100%',fontSize:11}}>
          <thead>
            <tr style={{background:'#f8fafc'}}>
              <th style={{position:'sticky',left:0,zIndex:3,background:'#f8fafc',width:160,padding:'8px 10px',textAlign:'left',borderRight:'2px solid #e2e8f0',borderBottom:'2px solid #e2e8f0',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5}}>Worker</th>
              <th style={{position:'sticky',left:160,zIndex:3,background:'#f8fafc',width:100,padding:'8px 8px',textAlign:'left',borderRight:'1px solid #e2e8f0',borderBottom:'2px solid #e2e8f0',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>Trade</th>
              <th style={{position:'sticky',left:260,zIndex:3,background:'#f8fafc',width:50,padding:'8px 6px',textAlign:'center',borderRight:'2px solid #cbd5e1',borderBottom:'2px solid #e2e8f0',fontSize:10,fontWeight:700,color:'#64748b'}}>Rate</th>
              {dayMeta.map(dm => (
                <th key={dm.day} style={{width:38,minWidth:38,padding:'4px 2px',textAlign:'center',fontSize:9,fontWeight:700,borderBottom:'2px solid #e2e8f0',borderRight:'1px solid #f1f5f9',background:dm.isHoliday?'#fee2e2':dm.isFriday?'#fef3c7':'#f8fafc',color:dm.isHoliday?'#dc2626':dm.isFriday?'#d97706':'#64748b'}}>
                  <div>{dm.day}</div><div style={{fontSize:8,fontWeight:400}}>{dm.dayName}</div>{dm.isHoliday&&<div style={{fontSize:7}}>PH</div>}
                </th>
              ))}
              {[['Total','#0f172a'],['Normal','#64748b'],['OT','#d97706'],['Gross','#0d9488']].map(([label,color]) => (
                <th key={label} style={{width:58,minWidth:58,padding:'8px 6px',textAlign:'right',fontSize:10,fontWeight:700,borderBottom:'2px solid #e2e8f0',borderLeft:label==='Total'?'2px solid #cbd5e1':'1px solid #f1f5f9',color,background:'#f8fafc'}}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map((worker,workerIdx) => {
              const workerLines = allLines.filter(l => l.worker_id === worker.id)
              const totalHrs = workerLines.reduce((s,l) => s+Number(l.total_hours||0),0)
              const normalHrs = workerLines.reduce((s,l) => s+Number(l.normal_hours||0),0)
              const otHrs = workerLines.reduce((s,l) => s+Number(l.ot_hours||0),0)
              const isFlat = worker.category==='Contract Worker'||worker.category==='Subcontract Worker'
              const grossPay = isFlat ? totalHrs * Number(worker.hourly_rate||0) : Number(worker.monthly_salary||0)

              return (
                <tr key={worker.id} style={{background:workerIdx%2===0?'white':'#fafafa',borderTop:workerIdx>0?'1px solid #f1f5f9':'none'}}>
                  <td style={{position:'sticky',left:0,zIndex:2,background:workerIdx%2===0?'white':'#fafafa',padding:'8px 10px',borderRight:'2px solid #e2e8f0'}}>
                    <div style={{fontWeight:600,fontSize:12,color:'#0f172a'}}>{worker.full_name}</div>
                    <div style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>{worker.worker_number}</div>
                  </td>
                  <td style={{position:'sticky',left:160,zIndex:2,background:workerIdx%2===0?'white':'#fafafa',padding:'8px',borderRight:'1px solid #e2e8f0',fontSize:11,color:'#334155'}}>{worker.trade_role}</td>
                  <td style={{position:'sticky',left:260,zIndex:2,background:workerIdx%2===0?'white':'#fafafa',padding:'4px 6px',textAlign:'center',borderRight:'2px solid #cbd5e1',fontSize:10,color:'#64748b'}}>
                    {isFlat ? `${worker.hourly_rate}/h` : 'Salary'}
                  </td>
                  {dayMeta.map(dm => {
                    const hrs = getIWSHours(worker.id,dm.dateStr)
                    return (<td key={dm.day} style={{padding:'4px 2px',textAlign:'center',fontSize:10,borderRight:'1px solid #f9fafb',background:dm.isHoliday&&hrs>0?'#fee2e2':dm.isFriday&&hrs>0?'#fef3c7':hrs>8?'#fffbeb':'transparent',fontWeight:hrs>8?700:400,color:hrs>8?'#d97706':hrs===0||hrs===null?'#cbd5e1':'#0f172a'}}>{hrs===null||hrs===0?<span style={{color:'#e2e8f0'}}>—</span>:hrs}</td>)
                  })}
                  <td style={{textAlign:'right',padding:'8px 6px',fontWeight:700,fontSize:11,borderLeft:'2px solid #cbd5e1'}}>{totalHrs||'—'}h</td>
                  <td style={{textAlign:'right',padding:'8px 6px',fontSize:11,color:'#64748b'}}>{normalHrs||'—'}h</td>
                  <td style={{textAlign:'right',padding:'8px 6px',fontSize:11,color:otHrs>0?'#d97706':'#cbd5e1',fontWeight:otHrs>0?600:400}}>{otHrs>0?`${otHrs}h`:'—'}</td>
                  <td style={{textAlign:'right',padding:'8px 8px',fontSize:11,fontWeight:700,color:'#0d9488'}}>{grossPay>0?`AED ${Math.round(grossPay).toLocaleString()}`:'—'}</td>
                </tr>
              )
            })}
            {/* Totals */}
            <tr style={{background:'#0f172a',color:'white',position:'sticky',bottom:0}}>
              <td colSpan={2} style={{position:'sticky',left:0,zIndex:3,background:'#0f172a',padding:'10px 10px',fontWeight:700,fontSize:12,borderRight:'2px solid #1e293b'}}>TOTALS — {filteredWorkers.length} workers</td>
              <td style={{position:'sticky',left:260,zIndex:3,background:'#0f172a',borderRight:'2px solid #334155',padding:'10px 6px'}} />
              {dayMeta.map(dm => {
                const dayTotal = filteredWorkers.reduce((sum,w) => sum+Number(getIWSHours(w.id,dm.dateStr)||0),0)
                return <td key={dm.day} style={{padding:'6px 2px',textAlign:'center',fontSize:10,fontWeight:600,color:dayTotal>0?'#5eead4':'#334155',borderRight:'1px solid #1e293b'}}>{dayTotal>0?dayTotal:''}</td>
              })}
              {(() => {
                const gT=filteredWorkers.reduce((s,w)=>s+allLines.filter(l=>l.worker_id===w.id).reduce((a,l)=>a+Number(l.total_hours||0),0),0)
                const gN=filteredWorkers.reduce((s,w)=>s+allLines.filter(l=>l.worker_id===w.id).reduce((a,l)=>a+Number(l.normal_hours||0),0),0)
                const gOT=filteredWorkers.reduce((s,w)=>s+allLines.filter(l=>l.worker_id===w.id).reduce((a,l)=>a+Number(l.ot_hours||0),0),0)
                const gGross=filteredWorkers.reduce((s,w)=>{const ls=allLines.filter(l=>l.worker_id===w.id);const t=ls.reduce((a,l)=>a+Number(l.total_hours||0),0);const f=w.category==='Contract Worker'||w.category==='Subcontract Worker';if(f)return s+t*Number(w.hourly_rate||0);return s+Number(w.monthly_salary||0)},0)
                return (<>
                  <td style={{textAlign:'right',padding:'10px 6px',fontWeight:700,color:'white',borderLeft:'2px solid #334155'}}>{gT}h</td>
                  <td style={{textAlign:'right',padding:'10px 6px',color:'#94a3b8'}}>{gN}h</td>
                  <td style={{textAlign:'right',padding:'10px 6px',color:'#fbbf24',fontWeight:gOT>0?700:400}}>{gOT>0?`${gOT}h`:'—'}</td>
                  <td style={{textAlign:'right',padding:'10px 10px',fontWeight:700,color:'#5eead4',fontSize:12}}>AED {Math.round(gGross).toLocaleString()}</td>
                </>)
              })()}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom action bar */}
      <div style={{position:'sticky',bottom:0,background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 -4px 16px rgba(0,0,0,0.06)',marginTop:16}}>
        <div>
          {monthHeaders.length === 0 ? (
            <div style={{fontSize:13,color:'#94a3b8'}}>Upload a timesheet to begin</div>
          ) : (
            <div><div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ Timesheet data loaded</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{filteredWorkers.length} workers · {allLines.reduce((s,l)=>s+Number(l.total_hours||0),0)} total hours</div></div>
          )}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {step1Confirmed && selectedBatch ? (<>
            <span style={{fontSize:13,fontWeight:600,color:'#16a34a',background:'#f0fdf4',padding:'8px 14px',borderRadius:6}}>✓ Payroll Generated</span>
            <button className="btn btn-primary" onClick={() => setCurrentStep(2)}>Go to Step 2 →</button>
          </>) : (
            <button className="btn btn-primary" style={{padding:'10px 24px',fontSize:14,opacity:rpcLoading||monthHeaders.length===0?0.4:1}} disabled={rpcLoading||monthHeaders.length===0} onClick={handleGeneratePayroll}>
              {rpcLoading ? 'Generating...' : '⚡ Confirm Timesheet & Generate Payroll'}
            </button>
          )}
        </div>
      </div>
    </div>)
  }

  // ── Step 2: Payroll Calculation (reads from persisted payroll_lines) ──
  const Step2PayrollCalculation = () => {
    const totals = computeTotals()
    return (<div>
      <InstructionBanner step={2} title="Payroll Calculation" roleLabel="HR Admin" description="Review the calculated earnings for every worker. All figures are computed by the database RPC and persisted to payroll_lines. Add any adjustments needed and confirm before sending for Operations approval." howTo={['Review each worker row — click any row to see the full pay breakdown','Use the + Add Adjustment button to add bonuses, deductions, or advance recovery','Check the WPS / Non-WPS / Cash split totals are correct','When totals look right — click Confirm Calculation','To re-generate from scratch, use the Delete Draft button and start over']} />

      {/* Summary strip */}
      <div className="summary-strip" style={{marginBottom:16}}>
        {[['Gross Payroll',`AED ${totals.totalGross.toLocaleString(undefined,{minimumFractionDigits:2})}`,'teal'],['Total Deductions',`AED ${totals.totalDeductions.toLocaleString(undefined,{minimumFractionDigits:2})}`,'danger'],['Net Payroll',`AED ${totals.totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}`,'success'],['Workers',totals.workerCount,'neutral']].map(([label,value,tone]) => (<div key={label} className="stat-card"><div className={`num ${tone}`} style={{fontSize:16}}>{value}</div><div className="lbl">{label}</div></div>))}
      </div>

      {/* Payment split */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
        {[['🏦 WPS — C3 Card',totals.wpsTotal,'#0d9488','#f0fdfa','Via Endered/C3 platform'],['💵 Non-WPS',totals.nonWpsTotal,'#d97706','#fffbeb','C3 Card (Non-WPS)'],['⚠ Cash (Pending C3)',totals.cashTotal,'#dc2626','#fef2f2','C3 card not yet activated']].map(([label,amount,color,bg,sub]) => (<div key={label} style={{background:bg,border:`1.5px solid ${color}30`,borderRadius:10,padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:600,color,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
          <div style={{fontSize:20,fontWeight:700,color,marginBottom:4}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style={{fontSize:11,color:'#64748b'}}>{sub}</div>
        </div>))}
      </div>

      {/* Worker table */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Worker payroll lines</h2><p>Click any worker row to see full breakdown — data from payroll_lines</p></div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdjPanel(!showAdjPanel)}>+ Add Adjustment</button>
            {selectedBatch && ['draft','calculated'].includes(selectedBatch.status) && (
              <button className="btn btn-ghost btn-sm" style={{color:'#dc2626'}} onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText('') }}>Delete Draft</button>
            )}
          </div>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Worker</th><th>Category</th><th>Payment</th><th style={{textAlign:'right'}}>Rate / Salary</th><th style={{textAlign:'right'}}>Hours</th><th style={{textAlign:'right'}}>OT Pay</th><th style={{textAlign:'right'}}>Allowances</th><th style={{textAlign:'right'}}>Gross Pay</th><th style={{textAlign:'right'}}>Net Pay</th></tr></thead>
          <tbody>
            {payrollLines.map(line => {
              const w = line.worker || {}
              const isExp = expandedWorker === line.id
              const isHourly = line.payroll_type === 'hourly'
              return (<React.Fragment key={line.id}>
                <tr style={{cursor:'pointer',borderLeft:`3px solid ${{'Permanent Staff':'#1e3a8a','Office Staff':'#6366f1','Contract Worker':'#f59e0b','Subcontract Worker':'#94a3b8'}[w.category]||'#e2e8f0'}`,background:isExp?'#f0fdfa':'white'}} onClick={() => setExpandedWorker(isExp?null:line.id)}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{line.worker_name || w.full_name}</div><div style={{fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{line.worker_number || w.worker_number}</div></td>
                  <td><span style={{fontSize:11,background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:4}}>{w.category}</span></td>
                  <td><StatusBadge label={line.payment_method||'WPS'} tone={line.payment_method==='Non-WPS'?'warning':line.payment_method==='Cash'?'danger':'success'} /></td>
                  <td style={{textAlign:'right',fontSize:12}}>{isHourly?`AED ${line.rate_used || line.base_hourly_rate}/hr`:`AED ${Number(line.basic_salary||0).toLocaleString()}/mo`}</td>
                  <td style={{textAlign:'right',fontSize:12,color:line.total_hours>0?'#0f172a':'#cbd5e1'}}>{line.total_hours ? `${line.total_hours}h` : '—'}</td>
                  <td style={{textAlign:'right',fontSize:12,color:Number(line.ot1_pay||0)+Number(line.ot2_pay||0)>0?'#d97706':'#cbd5e1'}}>{Number(line.ot1_pay||0)+Number(line.ot2_pay||0)>0?`AED ${(Number(line.ot1_pay||0)+Number(line.ot2_pay||0)).toLocaleString()}`:'—'}</td>
                  <td style={{textAlign:'right',fontSize:12,color:Number(line.allowances_total||0)>0?'#16a34a':'#cbd5e1'}}>{Number(line.allowances_total||0)>0?`AED ${Number(line.allowances_total).toLocaleString()}`:'—'}</td>
                  <td style={{textAlign:'right',fontSize:12,fontWeight:600}}>AED {Number(line.gross_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td style={{textAlign:'right',fontSize:13,fontWeight:700,color:'#0d9488'}}>AED {Number(line.net_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>
                {isExp && (<tr><td colSpan={9} style={{padding:0,background:'#f0fdfa',borderBottom:'2px solid #0d9488'}}>
                  <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#0d9488',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Earnings Breakdown</div>
                      {isHourly ? (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hourly Rate (snapshot)</span><span>AED {line.rate_used || line.base_hourly_rate}/hr</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hours Worked</span><span>{line.total_hours}h</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Standard Pay</span><span>AED {Number(line.basic_salary||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                        {Number(line.ot2_hours||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>Holiday Premium ({line.ot2_hours}h × ×0.50)</span><span>AED {Number(line.ot2_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                      </>) : (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Basic Salary</span><span style={{fontWeight:600}}>AED {Number(line.basic_salary||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                        {Number(line.allowances_total||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#16a34a'}}><span>Allowances (H:{line.housing_allowance} T:{line.transport_allowance} F:{line.food_allowance})</span><span>AED {Number(line.allowances_total).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                        {Number(line.ot1_hours||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#d97706'}}><span>OT Weekday ({line.ot1_hours}h × {Number(line.base_hourly_rate||0).toFixed(2)} × 1.25)</span><span>AED {Number(line.ot1_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                        {Number(line.ot2_hours||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>OT Fri/Holiday ({line.ot2_hours}h × {Number(line.base_hourly_rate||0).toFixed(2)} × 1.50)</span><span>AED {Number(line.ot2_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                      </>)}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:8}}><span>Gross Earnings</span><span style={{color:'#0d9488'}}>AED {Number(line.gross_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#dc2626',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Deductions</div>
                      {Number(line.deductions_total||0) === 0 ? <div style={{fontSize:12,color:'#94a3b8',fontStyle:'italic'}}>No deductions this period</div> : (
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,color:'#dc2626'}}><span>Total Deductions</span><span>-AED {Number(line.deductions_total).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                      )}
                      <div style={{background:'#0f172a',color:'white',borderRadius:8,padding:'12px 14px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,fontWeight:700}}>NET PAY</span><span style={{fontSize:16,fontWeight:800,color:'#5eead4'}}>AED {Number(line.net_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                    </div>
                  </div>
                </td></tr>)}
              </React.Fragment>)
            })}
          </tbody>
        </table></div>
      </div>

      {/* Add adjustment panel */}
      {showAdjPanel && (<div className="panel" style={{marginBottom:20,border:'2px solid #0d9488'}}>
        <div className="panel-header"><h2>Add Adjustment</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowAdjPanel(false)}>✕</button></div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 2fr 1fr auto',gap:12,alignItems:'flex-end'}}>
          <div className="form-field"><label className="form-label">Worker *</label><select className="form-select" value={adjForm.worker_id} onChange={e=>setAdjForm({...adjForm,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}</select></div>
          <div className="form-field"><label className="form-label">Type *</label><select className="form-select" value={adjForm.type} onChange={e=>setAdjForm({...adjForm,type:e.target.value})}><option value="deduction">Deduction</option><option value="allowance">Allowance / Bonus</option><option value="advance">Advance Recovery</option></select></div>
          <div className="form-field"><label className="form-label">Label / Reason *</label><input className="form-input" placeholder="e.g. Advance recovery" value={adjForm.label} onChange={e=>setAdjForm({...adjForm,label:e.target.value})} /></div>
          <div className="form-field"><label className="form-label">Amount (AED) *</label><input className="form-input" type="number" min={0} step={0.01} placeholder="0.00" value={adjForm.amount} onChange={e=>setAdjForm({...adjForm,amount:e.target.value})} /></div>
          <button className="btn btn-teal" disabled={!adjForm.worker_id||!adjForm.label||!adjForm.amount} onClick={async () => {
            try {
              await addPayrollAdjustment({batch_id:selectedBatch?.id,worker_id:adjForm.worker_id,adjustment_type:adjForm.type,label:adjForm.label,amount:parseFloat(adjForm.amount)})
              const adjs = await getAdjustmentsByBatch(selectedBatch?.id)
              setPayrollAdjustments(adjs)
              setAdjForm({worker_id:'',type:'deduction',label:'',amount:''})
              showSuccess('Adjustment added')
            } catch(e) { showError(e.message) }
          }}>Add</button>
        </div>
      </div>)}

      {/* Delete Draft Modal */}
      {showDeleteConfirm && (<div style={{background:'#fef2f2',border:'2px solid #fca5a5',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
        <div style={{fontWeight:700,color:'#dc2626',marginBottom:8}}>Delete Draft Batch</div>
        <p style={{fontSize:12,color:'#7c2d12',marginBottom:12}}>This will permanently delete the batch and all its payroll lines. Type <strong>{`${MONTH_NAMES[selectedMonth - 1]}-${selectedYear}`.toUpperCase()}</strong> to confirm.</p>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input className="form-input" style={{maxWidth:240}} placeholder={`${MONTH_NAMES[selectedMonth - 1]}-${selectedYear}`.toUpperCase()} value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />
          <button className="btn btn-danger" disabled={deleting} onClick={handleDeleteBatch}>{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
          <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
        </div>
      </div>)}

      {/* Bottom action bar */}
      <div style={{position:'sticky',bottom:0,background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 -4px 16px rgba(0,0,0,0.06)',marginTop:16}}>
        <div>
          <div><div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ Calculation ready — totals confirmed</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Gross: AED {totals.totalGross.toLocaleString(undefined,{minimumFractionDigits:2})} · Net: AED {totals.totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>← Back to Step 1</button>
          {step2Confirmed?(<><span style={{fontSize:13,fontWeight:600,color:'#16a34a',background:'#f0fdf4',padding:'8px 14px',borderRadius:6}}>✓ Step 2 Complete</span><button className="btn btn-secondary" onClick={() => {setStep2Confirmed(false);setStepStatus(prev=>({...prev,2:'active',3:'locked'}))}}>← Edit Calculation</button><button className="btn btn-primary" onClick={() => setCurrentStep(3)}>Go to Step 3 →</button></>)
          :(<button className="btn btn-primary" style={{padding:'10px 24px',fontSize:14}} onClick={async () => {
            setStep2Confirmed(true); setStepStatus(prev=>({...prev,2:'complete',3:'active'}))
            if(selectedBatch) {
              try {
                // On resubmission after rejection, reset approval statuses
                const resubmitFields = { status:'calculated', ops_approval_status:'pending', ops_rejection_reason:null, owner_approval_status:'pending', owner_rejection_reason:null }
                await updatePayrollBatch(selectedBatch.id, resubmitFields)
                setOpsRejected(false); setOpsRejectionNote(''); setOwnerRejected(false); setOwnerRejectionNote('')
                setStep3Approved(false); setStep4Approved(false)
              } catch(e) { console.error(e) }
            }
            showSuccess('Payroll calculation confirmed — sent for Operations approval'); setCurrentStep(3)
          }}>✓ Confirm & Send for Operations Approval →</button>)}
        </div>
      </div>
    </div>)
  }

  // ── Step 3: Operations Approval ──
  const Step3OperationsApproval = () => {
    const canApproveOps = role === 'operations' || role === 'owner' || role === 'accounts'
    const filteredW = workers.filter(w => w.category !== 'Office Staff')
    const flaggedCount = Object.keys(flaggedWorkers).length

    const monthIndex = (selectedMonth || 1) - 1
    const yearNum = selectedYear || 2026
    const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate()
    const dayMeta = Array.from({length:daysInMonth},(_,i) => {
      const day=i+1; const dateStr=`${yearNum}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const dateObj=new Date(yearNum,monthIndex,day); const dow=dateObj.getDay()
      return {day,dateStr,isFriday:dow===5,isHoliday:isHoliday(dateStr)}
    })
    const getIWSHours = (wId,dateStr) => { const l=allLines.find(l=>l.worker_id===wId&&l.work_date===dateStr); return l?Number(l.total_hours||0):null }

    return (<div>
      <InstructionBanner step={3} title="Operations Approval" roleLabel="Operations" description="Review the payroll hours and confirm they match what actually happened on site." howTo={['Review the worker hours summary table below','Check each worker\'s total hours match your site records','Click Flag next to any worker if their hours are incorrect','If everything is correct: click Approve Hours','If something needs fixing: click Reject and explain what HR needs to correct']} />

      {opsRejected && (<div style={{background:'#fff7ed',border:'2px solid #fb923c',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
        <div style={{fontWeight:700,color:'#c2410c',fontSize:14,marginBottom:8}}>⚠ Operations rejected this payroll</div>
        <div style={{fontSize:13,color:'#7c2d12',marginBottom:12,background:'#fef2f2',borderRadius:6,padding:'10px 14px',border:'1px solid #fca5a5'}}><strong>Rejection reason:</strong> {opsRejectionNote}</div>
      </div>)}

      {!canApproveOps&&!opsRejected&&<div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#0369a1'}}>ℹ Waiting for Operations to review and approve. This page is read-only for {role} role.</div>}

      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Timesheet Hours Summary — {MONTH_NAMES[monthIndex]} {yearNum}</h2><p>Operations: verify these hours match site records</p></div></div>
        <div style={{overflowX:'auto'}}>
          <table style={{borderCollapse:'collapse',minWidth:'100%',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              <th style={{position:'sticky',left:0,zIndex:2,background:'#f8fafc',padding:'6px 10px',textAlign:'left',borderRight:'2px solid #e2e8f0',borderBottom:'2px solid #e2e8f0',fontSize:10,minWidth:160}}>Worker</th>
              <th style={{position:'sticky',left:160,zIndex:2,background:'#f8fafc',padding:'6px 8px',textAlign:'left',borderRight:'2px solid #e2e8f0',borderBottom:'2px solid #e2e8f0',fontSize:10,minWidth:80}}>Trade</th>
              {dayMeta.map(dm => <th key={dm.day} style={{padding:'4px 2px',textAlign:'center',minWidth:32,fontSize:9,borderBottom:'2px solid #e2e8f0',background:dm.isHoliday?'#fee2e2':dm.isFriday?'#fef3c7':'#f8fafc',color:dm.isHoliday?'#dc2626':dm.isFriday?'#d97706':'#64748b'}}>{dm.day}</th>)}
              <th style={{padding:'6px',textAlign:'right',borderLeft:'2px solid #e2e8f0',borderBottom:'2px solid #e2e8f0',fontSize:10,fontWeight:700,minWidth:50}}>Total</th>
              <th style={{padding:'6px',textAlign:'center',borderBottom:'2px solid #e2e8f0',fontSize:10,minWidth:60}}>Flag</th>
            </tr></thead>
            <tbody>
              {filteredW.map((w,i) => {
                const wLines = allLines.filter(l=>l.worker_id===w.id)
                const total = wLines.reduce((s,l)=>s+Number(l.total_hours||0),0)
                const isFlagged = !!flaggedWorkers[w.id]
                return (<React.Fragment key={w.id}>
                  <tr style={{borderBottom:'1px solid #f1f5f9',background:isFlagged?'#fef2f2':i%2===0?'white':'#fafafa'}}>
                    <td style={{position:'sticky',left:0,zIndex:1,background:isFlagged?'#fef2f2':i%2===0?'white':'#fafafa',padding:'6px 10px',borderRight:'2px solid #e2e8f0'}}>
                      <div style={{fontWeight:600,fontSize:11}}>{w.full_name}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{w.worker_number}</div>
                      {isFlagged&&<div style={{fontSize:9,color:'#dc2626',fontWeight:600,marginTop:2}}>⚠ {flaggedWorkers[w.id]}</div>}
                    </td>
                    <td style={{position:'sticky',left:160,zIndex:1,background:isFlagged?'#fef2f2':i%2===0?'white':'#fafafa',padding:'6px 8px',borderRight:'2px solid #e2e8f0',fontSize:10}}>{w.trade_role}</td>
                    {dayMeta.map(dm => { const hrs=getIWSHours(w.id,dm.dateStr); return <td key={dm.day} style={{padding:'3px 1px',textAlign:'center',fontSize:10,color:hrs>0?(hrs>8?'#d97706':'#0f172a'):'#e2e8f0',fontWeight:hrs>8?700:400,background:dm.isHoliday&&hrs>0?'#fef2f2':dm.isFriday&&hrs>0?'#fffbeb':'transparent'}}>{hrs>0?hrs:'—'}</td>})}
                    <td style={{textAlign:'right',padding:'6px',fontWeight:700,fontSize:11,borderLeft:'2px solid #e2e8f0'}}>{total>0?`${total}h`:'—'}</td>
                    <td style={{textAlign:'center',padding:'6px'}}>
                      {canApproveOps&&!opsRejected&&!step3Approved&&(isFlagged?<span style={{fontSize:10,color:'#dc2626',fontWeight:600}}>⚠ Flagged</span>:flaggingWorker===w.id?null:<button className="btn btn-ghost btn-sm" style={{fontSize:10,color:'#d97706'}} onClick={() => {setFlaggingWorker(w.id);setFlagNote('')}}>Flag</button>)}
                    </td>
                  </tr>
                  {flaggingWorker===w.id&&<tr><td colSpan={dayMeta.length+4} style={{padding:'8px 16px',background:'#fffbeb'}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input className="form-input" style={{flex:1,fontSize:12}} placeholder="What is wrong with these hours?" value={flagNote} onChange={e=>setFlagNote(e.target.value)} />
                      <button className="btn btn-teal btn-sm" disabled={!flagNote.trim()} onClick={() => {setFlaggedWorkers(prev=>({...prev,[w.id]:flagNote}));showSuccess(`${w.full_name} flagged`);setFlaggingWorker(null);setFlagNote('')}}>Submit Flag</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setFlaggingWorker(null)}>Cancel</button>
                    </div>
                  </td></tr>}
                </React.Fragment>)
              })}
            </tbody>
          </table>
        </div>
      </div>

      {canApproveOps&&!opsRejected&&!step3Approved&&(<div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'20px 24px',marginTop:20}}>
        <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16}}>Operations Decision</div>
        {flaggedCount>0&&<div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#dc2626',fontWeight:600}}>⚠ {flaggedCount} worker{flaggedCount>1?'s':''} flagged — resolve flags before approving, or reject with explanation</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <button className="btn btn-secondary" style={{padding:14,fontSize:14,border:'2px solid #dc2626',color:'#dc2626'}} onClick={() => setShowOpsRejectModal(true)}>✕ Reject — Send back to HR</button>
          <button className="btn btn-primary" style={{padding:14,fontSize:14,background:'linear-gradient(135deg,#0d9488,#0891b2)',opacity:flaggedCount>0?0.5:1,cursor:flaggedCount>0?'not-allowed':'pointer'}} disabled={flaggedCount>0} onClick={async () => {
            if(flaggedCount>0) return
            if(!window.confirm(`Confirm: You have reviewed all hours for ${MONTH_NAMES[(selectedMonth||1)-1]} ${selectedYear} and they are correct?`)) return
            if(selectedBatch) {
              try {
                const approverName = role==='owner'?'Management':role==='accounts'?'Accounts':'Operations'
                await approvePayrollBatchOps(selectedBatch.id, role, approverName)
                setSelectedBatch(prev => ({...prev, status:'ops_approved', ops_approval_status:'approved'}))
                setStep3Approved(true);setStepStatus(prev=>({...prev,3:'complete',4:'active'}))
                showSuccess('Hours approved by Operations — sent for Management approval');setCurrentStep(4)
              } catch(e) { showError(e.message) }
            }
          }}>✓ Approve Hours — Send for Management Approval</button>
        </div>
      </div>)}

      <div style={{position:'sticky',bottom:0,background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 -4px 16px rgba(0,0,0,0.06)',marginTop:16}}>
        <div>{opsRejected?<div style={{fontSize:13,fontWeight:600,color:'#c2410c'}}>⚠ Rejected by Operations — HR must address and resubmit</div>:step3Approved?<div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ Operations approved — awaiting Management</div>:<div style={{fontSize:13,color:'#64748b'}}>Waiting for Operations to review and approve hours</div>}</div>
        <div style={{display:'flex',gap:8}}><button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>← Back to Step 2</button>{step3Approved&&<button className="btn btn-primary" onClick={() => setCurrentStep(4)}>Go to Step 4 →</button>}</div>
      </div>
    </div>)
  }

  // ── Step 4: Owner Approval ──
  const Step4OwnerApproval = () => {
    const canApprove = role === 'owner' || role === 'accounts'
    const totals = computeTotals()
    const allChecked = approvalChecklist.conflicts && approvalChecklist.penalties && approvalChecklist.opsApproved && approvalChecklist.carryOver && approvalChecklist.wpsReviewed

    return (<div>
      <InstructionBanner step={4} title="Management Approval" roleLabel="Management / Accounts"
        description="This is the final review before payroll is executed. Review all totals, confirm the pre-approval checklist, and sign off."
        howTo={['Review the payroll summary cards and WPS split','Expand any worker row to inspect their full breakdown','Complete all 5 checklist items','Click Approve & Lock to finalize, or Reject to send back']} />

      {!canApprove && <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#0369a1'}}>ℹ Only Management or Accounts role can approve payroll. Current role: {role}</div>}

      {ownerRejected && (<div style={{background:'#fff7ed',border:'2px solid #fb923c',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
        <div style={{fontWeight:700,color:'#c2410c',fontSize:14,marginBottom:8}}>⚠ Owner/Accounts rejected this payroll</div>
        <div style={{fontSize:13,color:'#7c2d12',marginBottom:12,background:'#fef2f2',borderRadius:6,padding:'10px 14px',border:'1px solid #fca5a5'}}><strong>Rejection reason:</strong> {ownerRejectionNote}</div>
      </div>)}

      {step4Approved && <div style={{background:'#f0fdf4',border:'2px solid #86efac',borderRadius:10,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:24}}>✓</span>
        <div><div style={{fontWeight:700,color:'#16a34a',fontSize:15}}>Payroll Approved & Locked</div><div style={{fontSize:12,color:'#15803d'}}>This batch has been signed off. Proceed to Step 5 to generate files.</div></div>
      </div>}

      <div className="summary-strip" style={{marginBottom:16}}>
        {[['Gross Payroll',`AED ${totals.totalGross.toLocaleString(undefined,{minimumFractionDigits:2})}`,'teal'],['Total Deductions',`AED ${totals.totalDeductions.toLocaleString(undefined,{minimumFractionDigits:2})}`,'danger'],['Net Payroll',`AED ${totals.totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}`,'success'],['Workers',totals.workerCount,'neutral']].map(([label,value,tone]) => (<div key={label} className="stat-card"><div className={`num ${tone}`} style={{fontSize:16}}>{value}</div><div className="lbl">{label}</div></div>))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
        {[['🏦 WPS — C3 Card',totals.wpsTotal,'#0d9488','#f0fdfa'],['💵 Non-WPS',totals.nonWpsTotal,'#d97706','#fffbeb'],['⚠ Cash',totals.cashTotal,'#dc2626','#fef2f2']].map(([label,amount,color,bg]) => (<div key={label} style={{background:bg,border:`1.5px solid ${color}30`,borderRadius:10,padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:600,color,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
          <div style={{fontSize:20,fontWeight:700,color}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>))}
      </div>

      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Final Payroll Review</h2><p>Click any row to inspect full breakdown</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Worker</th><th>Category</th><th>Payment</th><th style={{textAlign:'right'}}>Gross</th><th style={{textAlign:'right'}}>Deductions</th><th style={{textAlign:'right'}}>Net Pay</th></tr></thead>
          <tbody>
            {payrollLines.map(line => {
              const w = line.worker || {}
              const isExp = expandedWorker===('owner_'+line.id)
              const isHourly = line.payroll_type === 'hourly'
              return (<React.Fragment key={line.id}>
                <tr style={{cursor:'pointer',background:isExp?'#f0fdfa':'white'}} onClick={() => setExpandedWorker(isExp?null:'owner_'+line.id)}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{line.worker_name || w.full_name}</div><div style={{fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{line.worker_number || w.worker_number}</div></td>
                  <td><span style={{fontSize:11,background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:4}}>{w.category}</span></td>
                  <td><StatusBadge label={line.payment_method||'WPS'} tone={line.payment_method==='Cash'?'danger':'success'} /></td>
                  <td style={{textAlign:'right',fontSize:12}}>AED {Number(line.gross_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td style={{textAlign:'right',fontSize:12,color:Number(line.deductions_total||0)>0?'#dc2626':'#cbd5e1'}}>{Number(line.deductions_total||0)>0?`-AED ${Number(line.deductions_total).toLocaleString(undefined,{minimumFractionDigits:2})}`:'—'}</td>
                  <td style={{textAlign:'right',fontSize:13,fontWeight:700,color:'#0d9488'}}>AED {Number(line.net_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>
                {isExp && (<tr><td colSpan={6} style={{padding:0,background:'#f0fdfa',borderBottom:'2px solid #0d9488'}}>
                  <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#0d9488',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Earnings</div>
                      {isHourly ? (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hourly Rate</span><span>AED {line.rate_used || line.base_hourly_rate}/hr</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hours Worked</span><span>{line.total_hours}h</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Standard Pay</span><span>AED {Number(line.basic_salary||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                      </>) : (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Basic Salary</span><span style={{fontWeight:600}}>AED {Number(line.basic_salary||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                        {Number(line.allowances_total||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#16a34a'}}><span>Allowances</span><span>AED {Number(line.allowances_total).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                      </>)}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:8}}><span>Gross</span><span style={{color:'#0d9488'}}>AED {Number(line.gross_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                    </div>
                    <div>
                      <div style={{background:'#0f172a',color:'white',borderRadius:8,padding:'12px 14px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,fontWeight:700}}>NET PAY</span><span style={{fontSize:16,fontWeight:800,color:'#5eead4'}}>AED {Number(line.net_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                    </div>
                  </div>
                </td></tr>)}
              </React.Fragment>)
            })}
          </tbody>
        </table></div>
      </div>

      {canApprove && !step4Approved && (<div className="panel" style={{marginBottom:20,border:'2px solid #0891b2'}}>
        <div className="panel-header"><div><h2>Pre-Approval Checklist</h2><p>All items must be green before you can approve</p></div></div>
        <div style={{padding:'16px 20px'}}>
          {[
            {key:'conflicts',label:'All timesheet conflicts resolved',ok:approvalChecklist.conflicts},
            {key:'opsApproved',label:'Operations has approved hours',ok:approvalChecklist.opsApproved},
            {key:'penalties',label:'All penalties confirmed or removed',ok:approvalChecklist.penalties},
            {key:'carryOver',label:'Carry-over notes addressed',ok:approvalChecklist.carryOver},
            {key:'wpsReviewed',label:'WPS / Non-WPS split reviewed',ok:approvalChecklist.wpsReviewed}
          ].map(item => (
            <div key={item.key} onClick={() => setApprovalChecklist(prev=>({...prev,[item.key]:!prev[item.key]}))} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #f1f5f9',cursor:'pointer'}}>
              <div style={{width:22,height:22,borderRadius:6,background:item.ok?'#16a34a':'#f1f5f9',border:item.ok?'none':'2px solid #cbd5e1',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700,flexShrink:0}}>{item.ok?'✓':''}</div>
              <div style={{fontSize:13,color:item.ok?'#16a34a':'#64748b',fontWeight:item.ok?600:400}}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{padding:'0 20px 20px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <button className="btn btn-secondary" style={{padding:14,fontSize:14,border:'2px solid #dc2626',color:'#dc2626'}} onClick={() => setShowOwnerRejectModal(true)}>✕ Reject — Send back for review</button>
            <button className="btn btn-primary" style={{padding:'14px',fontSize:15,background:allChecked?'linear-gradient(135deg,#0d9488,#0891b2)':'#cbd5e1',cursor:allChecked?'pointer':'not-allowed',border:'none',borderRadius:10,fontWeight:700,color:'white'}} disabled={!allChecked} onClick={() => setShowApprovalModal(true)}>✅ APPROVE & LOCK PAYROLL</button>
          </div>
          {!allChecked && <div style={{textAlign:'center',fontSize:11,color:'#94a3b8',marginTop:8}}>Complete all checklist items to enable approval</div>}
        </div>
      </div>)}

      <div style={{position:'sticky',bottom:0,background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 -4px 16px rgba(0,0,0,0.06)',marginTop:16}}>
        <div>{step4Approved?<div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ Payroll approved and locked by Management</div>:<div style={{fontSize:13,color:'#64748b'}}>Awaiting Management approval</div>}</div>
        <div style={{display:'flex',gap:8}}><button className="btn btn-secondary" onClick={() => setCurrentStep(3)}>← Back to Step 3</button>{step4Approved&&<button className="btn btn-primary" onClick={() => setCurrentStep(5)}>Go to Step 5 →</button>}</div>
      </div>
    </div>)
  }

  // ── Step 5: Run & Distribute ──
  const Step5RunAndDistribute = () => {
    const totals = computeTotals()
    const batchLabel = selectedBatch?.month_label || `${MONTH_NAMES[(selectedMonth||1)-1]} ${selectedYear}`

    const generateWPSExcel = async () => {
      const XLSX = (await import('xlsx'))
      const wpsData = payrollLines.filter(l=>l.payment_method==='WPS'||!l.payment_method).map(l=>{const w=l.worker||{};return {'IT Employee ID':l.worker_number||w.worker_number,'Full Name':l.worker_name||w.full_name,'Category':w.category,'Pay Type':l.payroll_type==='hourly'?'Hourly Rate':'Monthly Salary','Basic / Rate':l.payroll_type==='hourly'?l.rate_used:l.basic_salary,'Total Hours':l.total_hours||'','Allowances':l.allowances_total,'OT1 Pay':l.ot1_pay,'OT2 Pay':l.ot2_pay,'Gross Pay':l.gross_pay,'Deductions':l.deductions_total,'Net Pay':l.net_pay,'Payment Method':'WPS — C3 Card (Endered)'}})
      const nonWpsData = payrollLines.filter(l=>l.payment_method==='Non-WPS'||l.payment_method==='Cash').map(l=>{const w=l.worker||{};return {'IT Employee ID':l.worker_number||w.worker_number,'Full Name':l.worker_name||w.full_name,'Gross Pay':l.gross_pay,'Deductions':l.deductions_total,'Net Pay':l.net_pay,'Payment':l.payment_method}})
      const summaryData = [{'Section':'GRAND TOTAL','Amount':totals.totalNet,'WPS/Non-WPS':`WPS: AED ${totals.wpsTotal.toLocaleString()} | Non-WPS: AED ${totals.nonWpsTotal.toLocaleString()} | Cash: AED ${totals.cashTotal.toLocaleString()}`,'Workers':totals.workerCount}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(wpsData),'WPS Workers')
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(nonWpsData.length>0?nonWpsData:[{Note:'No Non-WPS workers'}]),'Non-WPS')
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summaryData),'Summary')
      XLSX.writeFile(wb,`Innovation_Payroll_${batchLabel.replace(/\s+/g,'_')}.xlsx`)
    }

    return (<div>
      <div className="no-print">
      <InstructionBanner step={5} title="Run & Distribute" roleLabel="HR Admin / Management"
        description="Payroll has been approved. Download the WPS file and distribute to workers."
        howTo={['Download the WPS Excel file for Endered/C3 upload','The batch is now locked — no further edits are possible']} />
      </div>

      <div id="summary-print-area">
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',borderRadius:12,padding:'24px 28px',marginBottom:24,display:'flex',alignItems:'center',gap:16}}>
        <div style={{width:48,height:48,borderRadius:'50%',background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔒</div>
        <div>
          <div style={{color:'white',fontSize:18,fontWeight:700,marginBottom:4}}>Payroll Approved & Locked</div>
          <div style={{color:'#94a3b8',fontSize:13}}>{batchLabel} · {totals.workerCount} workers · Net: AED {totals.totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
          {selectedBatch?.retain_until && <div style={{color:'#64748b',fontSize:12,marginTop:4}}>Records retained until {new Date(selectedBatch.retain_until).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>}
        </div>
      </div>

      <div className="no-print" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:24}}>
        <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>📊</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>WPS Excel</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>For Endered/C3 platform upload</div>
          <button className="btn btn-primary btn-sm" onClick={generateWPSExcel}>Download .xlsx</button>
        </div>
        <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>📦</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>All Payslips</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>Download all as PDF ZIP</div>
          <button className="btn btn-primary btn-sm" disabled={zipping} onClick={async () => {
            setZipping(true)
            try {
              const { downloadBatchPayslipsZip } = await import('../../lib/payslipPDF')
              await downloadBatchPayslipsZip(selectedBatch, payrollLines)
            } finally { setZipping(false) }
          }}>{zipping ? 'Generating...' : 'Download ZIP'}</button>
        </div>
        <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>🖨</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>Summary Print</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>Full payroll summary report</div>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            document.body.classList.add('printing-summary')
            setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('printing-summary'), 500) }, 50)
          }}>Print</button>
        </div>
      </div>

      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Payroll Lines — {batchLabel}</h2><p>{payrollLines.length} workers</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Worker</th><th>Category</th><th>Payment</th><th style={{textAlign:'right'}}>Gross</th><th style={{textAlign:'right'}}>Net Pay</th><th className="no-print" style={{width:60}}></th></tr></thead>
          <tbody>
            {payrollLines.map(line => {
              const w = line.worker || {}
              return (<tr key={line.id}>
                <td><div style={{fontWeight:600,fontSize:13}}>{line.worker_name || w.full_name}</div><div style={{fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{line.worker_number || w.worker_number}</div></td>
                <td><span style={{fontSize:11,background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:4}}>{w.category}</span></td>
                <td><StatusBadge label={line.payment_method||'WPS'} tone={line.payment_method==='Cash'?'danger':line.payment_method==='Non-WPS'?'warning':'success'} /></td>
                <td style={{textAlign:'right',fontSize:12}}>AED {Number(line.gross_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                <td style={{textAlign:'right',fontSize:13,fontWeight:700,color:'#0d9488'}}>AED {Number(line.net_pay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                <td className="no-print" style={{textAlign:'center'}}>
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'#0d9488',fontSize:12,fontWeight:600,padding:'2px 6px'}}
                    disabled={pdfWorker === line.id}
                    onClick={async () => {
                      setPdfWorker(line.id)
                      try {
                        const { downloadPayslipPDF } = await import('../../lib/payslipPDF')
                        await downloadPayslipPDF(w, line, selectedBatch)
                      } finally { setPdfWorker(null) }
                    }}>{pdfWorker === line.id ? '...' : '📄 PDF'}</button>
                </td>
              </tr>)
            })}
          </tbody>
        </table></div>
      </div>

      <div style={{textAlign:'center',padding:'20px 0'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'#f1f5f9',borderRadius:20,padding:'8px 20px',fontSize:12,color:'#64748b'}}>
          <span>🔒</span> Batch locked · {new Date().toLocaleDateString('en-GB')}
        </div>
      </div>
      </div>{/* end summary-print-area */}
    </div>)
  }

  if (loading) return <AppShell pageTitle="Payroll Run"><div style={{padding:40,textAlign:'center'}}><div style={{fontSize:20,marginBottom:12}}>Loading...</div></div></AppShell>

  // Build period options from timesheets and batches
  const periodOptions = []
  const seen = new Set()
  ;[...timesheetHeaders, ...allBatches].forEach(item => {
    const key = `${item.month}-${item.year}`
    if (!seen.has(key)) { seen.add(key); periodOptions.push({ month: item.month, year: item.year, label: item.month_label || `${MONTH_NAMES[item.month-1]} ${item.year}` }) }
  })
  if (periodOptions.length === 0 && selectedMonth && selectedYear) {
    periodOptions.push({ month: selectedMonth, year: selectedYear, label: `${MONTH_NAMES[selectedMonth-1]} ${selectedYear}` })
  }

  return (<>
    <AppShell pageTitle="Payroll Run">
      <div style={{display:'flex',gap:0,minHeight:'calc(100vh - 60px)',margin:'-24px'}}>
        {/* Sidebar */}
        <div style={{width:260,minWidth:260,background:'white',borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',overflowY:'auto',zIndex:10}}>
          <div style={{background:'#0f172a',padding:16}}>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Payroll Period</div>
            <select className="form-select" style={{background:'#1e293b',color:'white',border:'1px solid #334155',fontSize:13}} value={selectedMonth&&selectedYear?`${selectedMonth}-${selectedYear}`:''} onChange={e => handlePeriodChange(e.target.value)}>
              {periodOptions.map(p => <option key={`${p.month}-${p.year}`} value={`${p.month}-${p.year}`}>{p.label}</option>)}
            </select>
            {selectedBatch?.status === 'locked' && <div style={{fontSize:11,color:'#f87171',marginTop:6}}>🔒 This payroll is locked</div>}
          </div>
          {steps.map(step => {
            const isClickable = stepStatus[step.number] !== 'locked'
            return (<div key={step.number} onClick={() => isClickable && setCurrentStep(step.number)} style={{padding:'14px 16px',borderBottom:'1px solid #f1f5f9',cursor:isClickable?'pointer':'not-allowed',background:currentStep===step.number?'#f0fdfa':'white',borderLeft:currentStep===step.number?'3px solid #0d9488':'3px solid transparent',transition:'all 0.15s ease',opacity:stepStatus[step.number]==='locked'?0.5:1}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:stepStatus[step.number]==='complete'?'#0d9488':stepStatus[step.number]==='error'?'#dc2626':stepStatus[step.number]==='active'?'#e0f2fe':'#f1f5f9',border:stepStatus[step.number]==='active'?'2px solid #0891b2':'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,color:stepStatus[step.number]==='complete'?'white':stepStatus[step.number]==='error'?'white':stepStatus[step.number]==='active'?'#0891b2':'#94a3b8'}}>{stepStatus[step.number]==='complete'?'✓':stepStatus[step.number]==='error'?'!':step.number}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:currentStep===step.number?'#0d9488':'#0f172a',marginBottom:2}}>{step.icon} {step.title}</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{step.subtitle}</div>
                </div>
                {stepStatus[step.number]==='complete'&&<span style={{fontSize:10,background:'#dcfce7',color:'#16a34a',padding:'2px 6px',borderRadius:4,fontWeight:600,flexShrink:0}}>Done</span>}
                {stepStatus[step.number]==='locked'&&<span style={{fontSize:14,color:'#cbd5e1',flexShrink:0}}>🔒</span>}
                {stepStatus[step.number]==='active'&&<span style={{fontSize:10,background:'#e0f2fe',color:'#0891b2',padding:'2px 6px',borderRadius:4,fontWeight:600,flexShrink:0}}>Active</span>}
                {stepStatus[step.number]==='error'&&<span style={{fontSize:10,background:'#fee2e2',color:'#dc2626',padding:'2px 6px',borderRadius:4,fontWeight:600,flexShrink:0}}>Rejected</span>}
              </div>
            </div>)
          })}
          <div style={{padding:'12px 16px',borderTop:'1px solid #f1f5f9'}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>Progress: {completedCount}/5 steps complete</div>
            <div style={{height:6,background:'#f1f5f9',borderRadius:3}}><div style={{height:'100%',width:`${(completedCount/5)*100}%`,background:'linear-gradient(90deg,#0d9488,#0891b2)',borderRadius:3,transition:'width 0.3s ease'}} /></div>
          </div>
          <div style={{padding:'12px 16px',background:'#f8fafc',marginTop:'auto'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:600,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Quick Stats</div>
            {[['Site Workers',workers.filter(w=>w.category!=='Office Staff').length,'neutral'],['Payroll Lines',payrollLines.length,'neutral'],['Timesheet Headers',timesheetHeaders.filter(h=>h.month===selectedMonth&&h.year===selectedYear).length,'neutral']].map(([label,value,tone]) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontSize:12,color:'#64748b'}}>{label}</span>
                <span style={{fontSize:12,fontWeight:600,color:tone==='danger'?'#dc2626':tone==='success'?'#16a34a':'#0f172a'}}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,padding:24,overflowY:'auto',background:'#f8fafc',minWidth:0}}>
          {successMsg&&<div style={{background:'#dcfce7',border:'1px solid #86efac',borderRadius:8,padding:'12px 16px',marginBottom:16,fontWeight:500,color:'#16a34a',fontSize:13}}>✓ {successMsg}</div>}
          {errorMsg&&<div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 16px',marginBottom:16,fontWeight:500,color:'#dc2626',fontSize:13}}>✕ {errorMsg}</div>}
          {currentStep===1&&<Step1TimesheetReview />}
          {currentStep===2&&<Step2PayrollCalculation />}
          {currentStep===3&&<Step3OperationsApproval />}
          {currentStep===4&&<Step4OwnerApproval />}
          {currentStep===5&&<Step5RunAndDistribute />}
        </div>
      </div>
    </AppShell>

    {showOpsRejectModal && (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:12,padding:28,width:'min(480px,90vw)',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Reject Payroll — Send back to HR</h3>
        <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Explain clearly what needs to be corrected.</p>
        <label className="form-label">Reason for rejection *</label>
        <textarea className="form-textarea" rows={4} placeholder="e.g. Worker Ahmed shows 16 hours on Day 5 — he was only on site for 8 hours." value={opsRejectDraft} onChange={e => setOpsRejectDraft(e.target.value)} />
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-secondary" onClick={() => {setShowOpsRejectModal(false);setOpsRejectDraft('')}}>Cancel</button>
          <button className="btn btn-danger" disabled={!opsRejectDraft.trim() || opsRejectDraft.trim().length < 10} onClick={async () => {
            if(selectedBatch) {
              try {
                const approverName = role==='owner'?'Management':role==='accounts'?'Accounts':'Operations'
                await rejectPayrollBatchOps(selectedBatch.id, role, approverName, opsRejectDraft)
                setOpsRejected(true);setOpsRejectionNote(opsRejectDraft);setShowOpsRejectModal(false);setStep3Approved(false);setStepStatus(prev=>({...prev,3:'error',4:'locked'}))
                setCurrentStep(2);showSuccess('Payroll rejected — HR notified');setOpsRejectDraft('')
              } catch(e) { showError(e.message);setShowOpsRejectModal(false) }
            }
          }}>✕ Confirm Rejection</button>
        </div>
      </div>
    </div>)}

    {showOwnerRejectModal && (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:12,padding:28,width:'min(480px,90vw)',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Reject Payroll — Send back for review</h3>
        <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Ops approval is preserved. Only the Owner gate reopens. Explain what needs correction.</p>
        <label className="form-label">Reason for rejection * (min 10 characters)</label>
        <textarea className="form-textarea" rows={4} placeholder="e.g. Housing allowance for Worker X looks wrong — should be AED 500 not 750." value={ownerRejectDraft} onChange={e => setOwnerRejectDraft(e.target.value)} />
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-secondary" onClick={() => {setShowOwnerRejectModal(false);setOwnerRejectDraft('')}}>Cancel</button>
          <button className="btn btn-danger" disabled={!ownerRejectDraft.trim() || ownerRejectDraft.trim().length < 10} onClick={async () => {
            if(selectedBatch) {
              try {
                const approverName = role==='owner'?'Management':role==='accounts'?'Accounts':role
                await rejectPayrollBatchOwner(selectedBatch.id, role, approverName, ownerRejectDraft)
                setOwnerRejected(true);setOwnerRejectionNote(ownerRejectDraft);setShowOwnerRejectModal(false)
                setStep4Approved(false);setStepStatus(prev=>({...prev,4:'error'}))
                setSelectedBatch(prev => ({...prev, status:'ops_approved', owner_approval_status:'rejected', owner_rejection_reason:ownerRejectDraft}))
                showSuccess('Payroll rejected by Owner — sent back for review');setOwnerRejectDraft('')
              } catch(e) { showError(e.message);setShowOwnerRejectModal(false) }
            }
          }}>✕ Confirm Rejection</button>
        </div>
      </div>
    </div>)}

    {showApprovalModal && (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:12,padding:28,width:'min(520px,90vw)',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{textAlign:'center',marginBottom:16}}>
          <div style={{fontSize:40,marginBottom:8}}>✅</div>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:4}}>Confirm Payroll Approval</h3>
          <p style={{fontSize:13,color:'#64748b'}}>This action will lock the batch. No further edits will be possible.</p>
        </div>
        <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:8,padding:'14px 16px',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#64748b'}}>Period</span><span style={{fontWeight:600}}>{selectedBatch?.month_label}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#64748b'}}>Workers</span><span style={{fontWeight:600}}>{computeTotals().workerCount}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#64748b'}}>Net Payroll</span><span style={{fontWeight:700,color:'#0d9488'}}>AED {computeTotals().totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-secondary" onClick={() => setShowApprovalModal(false)}>Cancel</button>
          <button className="btn btn-primary" style={{padding:'10px 24px',background:'linear-gradient(135deg,#0d9488,#0891b2)'}} onClick={async () => {
            if (selectedBatch) {
              try {
                const approverName = role==='owner'?'Management':role==='accounts'?'Accounts':role
                const updated = await approvePayrollBatchOwner(selectedBatch.id, role, approverName)
                setSelectedBatch(updated)
                setStep4Approved(true); setShowApprovalModal(false)
                setStepStatus(prev=>({...prev,4:'complete',5:'active'}))
                showSuccess(`Payroll approved and locked — records retained until ${updated.retain_until}`)
                setCurrentStep(5)
              } catch(e) { showError(e.message); setShowApprovalModal(false) }
            }
          }}>✅ Approve & Lock Payroll</button>
        </div>
      </div>
    </div>)}
  </>)
}

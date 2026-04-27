'use client'
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import { supabase } from '../../../lib/supabaseClient'
import { classifyDay, getHolidayName, daysInMonth, formatDateStr } from '../../../lib/dateUtils'
import { splitHours, detectConflict, capHours } from '../../../lib/timesheetGridLogic'
import { parseClientTimesheet, matchWorkerToIWS } from '../../../lib/excelParser'
import { getRole } from '../../../lib/mockAuth'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LETTERS = ['Su','Mo','Tu','We','Th','Fr','Sa']

const INNOVATION_INTERNAL_ID = 'b970a080-59aa-440c-aff0-27f9b4d7610c'

function TimesheetGridContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = getRole()
  const canEdit = role === 'owner' || role === 'hr_admin'

  const now = new Date()
  const [month, setMonth] = useState(Number(searchParams.get('month')) || (now.getMonth() + 1))
  const [year, setYear] = useState(Number(searchParams.get('year')) || now.getFullYear())
  const [clientId, setClientId] = useState(searchParams.get('client') || '')
  const supplierFilter = searchParams.get('supplier') || ''
  const [clients, setClients] = useState([])
  const [workers, setWorkers] = useState([])
  const [holidays, setHolidays] = useState([])
  const [header, setHeader] = useState(null)
  const [grid, setGrid] = useState({})
  const [cellStates, setCellStates] = useState({})
  const [ramadanMode, setRamadanMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)
  const [activePopover, setActivePopover] = useState(null)
  const [sickRefInput, setSickRefInput] = useState('')
  const [showSickModal, setShowSickModal] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [locked, setLocked] = useState(false)
  const debounceTimers = useRef({})
  const numDays = daysInMonth(month, year)

  // Load clients
  useEffect(() => {
    supabase.from('clients').select('id, name, is_internal').order('is_internal', { ascending: false }).order('name').then(({ data }) => {
      setClients(data || [])
      if (!clientId && data?.length) setClientId(data[0].id)
    })
  }, [])

  // Load holidays for year
  useEffect(() => {
    supabase.from('public_holidays').select('id, name, date').eq('year', year).then(({ data }) => setHolidays(data || []))
  }, [year])

  // Load workers + header + lines when client/month/year change
  useEffect(() => {
    if (!clientId) return
    loadGrid()
  }, [clientId, month, year])

  async function loadGrid() {
    setLoading(true)
    const isInternal = clientId === INNOVATION_INTERNAL_ID
    // Load workers
    let wQuery = supabase.from('workers').select('id, full_name, worker_number, category, rest_day, monthly_salary, hourly_rate, housing_allowance, transport_allowance, food_allowance, other_allowance').eq('status', 'active').order('worker_number')
    if (supplierFilter) {
      wQuery = wQuery.eq('supplier_id', supplierFilter)
    } else if (isInternal) {
      wQuery = wQuery.eq('category', 'Permanent Staff')
    } else {
      wQuery = wQuery.not('category', 'eq', 'Office Staff')
    }
    const { data: wData } = await wQuery
    setWorkers(wData || [])

    // Get or create header
    let { data: headers } = await supabase.from('timesheet_headers').select('*').eq('month', month).eq('year', year).eq('client_id', clientId).limit(1)
    let hdr = headers?.[0]
    if (!hdr) {
      const clientName = clients.find(c => c.id === clientId)?.name || 'Unknown'
      const { data: newHdr } = await supabase.from('timesheet_headers').insert({
        client_id: clientId, client_name: clientName, month, year,
        month_label: `${MONTH_NAMES[month - 1]} ${year}`,
        status: 'draft', ramadan_mode: false, uploaded_by: role
      }).select().single()
      hdr = newHdr
    }
    setHeader(hdr)
    setRamadanMode(hdr?.ramadan_mode || false)

    // Check payroll lock
    const { data: batches } = await supabase.from('payroll_batches').select('id, status').eq('month', month).eq('year', year).limit(1)
    setLocked(!!(batches?.[0] && batches[0].status !== 'deleted'))

    // Load existing lines
    if (hdr) {
      const { data: lines } = await supabase.from('timesheet_lines').select('*').eq('header_id', hdr.id)
      const g = {}
      ;(lines || []).forEach(l => {
        const day = new Date(l.work_date + 'T00:00:00').getDate()
        const key = `${l.worker_id}_${day}`
        g[key] = { ...l, total_hours: Number(l.total_hours), _saved: true }
      })
      setGrid(g)
      setCellStates({})
    }
    setLoading(false)
  }

  // Debounced auto-save
  const saveCell = useCallback(async (workerId, day, value) => {
    if (!header || locked) return
    const worker = workers.find(w => w.id === workerId)
    if (!worker) return
    const dateStr = formatDateStr(day, month, year)
    const dayType = classifyDay(dateStr, worker.rest_day || 'sunday', holidays)
    const capped = capHours(value)
    const { normal_hours, ot_hours, holiday_hours } = splitHours(capped, dayType, ramadanMode)
    const isConflict = detectConflict(capped, dayType)

    const key = `${workerId}_${day}`
    setCellStates(prev => ({ ...prev, [key]: 'saving' }))

    const row = {
      worker_id: workerId, header_id: header.id, work_date: dateStr,
      total_hours: capped, normal_hours, ot_hours, holiday_hours,
      is_friday: new Date(dateStr + 'T00:00:00').getDay() === 5,
      is_rest_day: dayType === 'rest_day',
      is_public_holiday: dayType === 'public_holiday',
      absence_status: isConflict ? 'conflict' : null
    }
    const { error } = await supabase.from('timesheet_lines').upsert(row, { onConflict: 'worker_id,work_date,header_id' })
    if (error) {
      setCellStates(prev => ({ ...prev, [key]: 'error' }))
    } else {
      setGrid(prev => ({ ...prev, [key]: { ...row, _saved: true } }))
      setCellStates(prev => ({ ...prev, [key]: 'saved' }))
      setTimeout(() => setCellStates(prev => { const n = { ...prev }; if (n[key] === 'saved') delete n[key]; return n }), 1500)
    }
  }, [header, workers, holidays, ramadanMode, month, year, locked])

  const handleCellChange = useCallback((workerId, day, rawValue) => {
    const key = `${workerId}_${day}`
    const capped = capHours(rawValue)
    setGrid(prev => ({ ...prev, [key]: { ...prev[key], total_hours: capped, _saved: false } }))
    setCellStates(prev => ({ ...prev, [key]: 'editing' }))
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key])
    debounceTimers.current[key] = setTimeout(() => saveCell(workerId, day, rawValue), 2000)
  }, [saveCell])

  // Conflict resolution
  const resolveConflict = useCallback(async (workerId, day, resolution) => {
    if (!header) return
    const key = `${workerId}_${day}`
    const dateStr = formatDateStr(day, month, year)
    const updates = {}
    if (resolution === 'unauthorised_absent') {
      updates.absence_status = 'unauthorised_absent'
      updates.total_hours = 0; updates.normal_hours = 0; updates.ot_hours = 0; updates.holiday_hours = 0
    } else if (resolution === 'sick_certified') {
      updates.absence_status = 'sick_certified'
    } else if (resolution === 'approved_leave') {
      updates.absence_status = 'approved_leave'
    } else if (resolution === 'short_day_authorised') {
      updates.absence_status = 'short_day_authorised'
    } else if (resolution === 'resolved_error') {
      updates.absence_status = 'resolved_error'
      updates.absence_note = 'Unknown public holiday — flagged for admin review'
    }

    const { error } = await supabase.from('timesheet_lines')
      .update(updates)
      .eq('header_id', header.id).eq('worker_id', workerId).eq('work_date', dateStr)
    if (!error) {
      setGrid(prev => ({ ...prev, [key]: { ...prev[key], ...updates, _saved: true } }))
    }
    setActivePopover(null)
  }, [header, month, year])

  const resolveSick = useCallback(async (workerId, day, ref) => {
    if (!header || !ref.trim()) return
    const dateStr = formatDateStr(day, month, year)
    const key = `${workerId}_${day}`
    const { error } = await supabase.from('timesheet_lines')
      .update({ absence_status: 'sick_certified', sick_cert_reference: ref.trim() })
      .eq('header_id', header.id).eq('worker_id', workerId).eq('work_date', dateStr)
    if (!error) {
      setGrid(prev => ({ ...prev, [key]: { ...prev[key], absence_status: 'sick_certified', sick_cert_reference: ref.trim(), _saved: true } }))
    }
    setShowSickModal(null); setSickRefInput('')
  }, [header, month, year])

  const resolveLeave = useCallback(async (workerId, day, leaveType) => {
    if (!header) return
    const dateStr = formatDateStr(day, month, year)
    const key = `${workerId}_${day}`
    const { error } = await supabase.from('timesheet_lines')
      .update({ absence_status: 'approved_leave', approved_leave_type: leaveType })
      .eq('header_id', header.id).eq('worker_id', workerId).eq('work_date', dateStr)
    if (!error) {
      setGrid(prev => ({ ...prev, [key]: { ...prev[key], absence_status: 'approved_leave', approved_leave_type: leaveType, _saved: true } }))
    }
    setActivePopover(null)
  }, [header, month, year])

  const resolveCorrectHours = useCallback(async (workerId, day, newHours) => {
    const key = `${workerId}_${day}`
    handleCellChange(workerId, day, newHours)
    setActivePopover(null)
  }, [handleCellChange])

  // Toggle ramadan
  const toggleRamadan = async (val) => {
    setRamadanMode(val)
    if (header) await supabase.from('timesheet_headers').update({ ramadan_mode: val }).eq('id', header.id)
  }

  // Conflict count
  const conflictCount = useMemo(() => {
    return Object.values(grid).filter(c => c.absence_status === 'conflict').length
  }, [grid])

  // Per-worker totals
  const workerTotals = useMemo(() => {
    const totals = {}
    workers.forEach(w => {
      let normal = 0, ot = 0, holiday = 0, total = 0
      for (let d = 1; d <= numDays; d++) {
        const cell = grid[`${w.id}_${d}`]
        if (!cell) continue
        const dateStr = formatDateStr(d, month, year)
        const dayType = classifyDay(dateStr, w.rest_day || 'sunday', holidays)
        const hrs = capHours(cell.total_hours)
        const split = splitHours(hrs, dayType, ramadanMode)
        normal += split.normal_hours; ot += split.ot_hours; holiday += split.holiday_hours
        total += hrs
      }
      totals[w.id] = { normal: Math.round(normal * 10) / 10, ot: Math.round(ot * 10) / 10, holiday: Math.round(holiday * 10) / 10, total: Math.round(total * 10) / 10 }
    })
    return totals
  }, [grid, workers, numDays, month, year, holidays, ramadanMode])

  // Generate Payroll
  const handleGeneratePayroll = async () => {
    if (conflictCount > 0) return
    const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`
    // Approve header first
    if (header) await supabase.from('timesheet_headers').update({ status: 'hr_approved' }).eq('id', header.id)
    const { error } = await supabase.rpc('generate_payroll_batch', { p_month: month, p_year: year, p_month_label: monthLabel })
    if (error) { alert('Error: ' + error.message); return }
    router.push('/payroll-run')
  }

  // Excel upload
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = await parseClientTimesheet(file)
      const matched = parsed.workers.map(pw => {
        const result = matchWorkerToIWS(pw.worker_name, workers)
        return { ...pw, iwsWorker: result?.worker || null, confidence: result?.confidence || null }
      })
      // Pre-fill grid
      const unmatched = []
      matched.forEach(m => {
        if (!m.iwsWorker) { unmatched.push(m.worker_name); return }
        m.daily_hours.forEach((hrs, idx) => {
          if (hrs > 0) handleCellChange(m.iwsWorker.id, idx + 1, hrs)
        })
      })
      setUploadResult({ total: matched.length, matched: matched.filter(m => m.iwsWorker).length, unmatched })
    } catch (err) { alert('Parse error: ' + err.message) }
    e.target.value = ''
  }

  // Save All
  const handleSaveAll = async () => {
    for (const [key, cell] of Object.entries(grid)) {
      if (!cell._saved) {
        const [wid, dayStr] = key.split('_')
        await saveCell(wid, parseInt(dayStr), cell.total_hours)
      }
    }
  }

  // Cell styling
  function cellBg(workerId, day) {
    const dateStr = formatDateStr(day, month, year)
    const worker = workers.find(w => w.id === workerId)
    const dayType = classifyDay(dateStr, worker?.rest_day || 'sunday', holidays)
    const key = `${workerId}_${day}`
    const cell = grid[key]
    const status = cell?.absence_status

    if (status === 'unauthorised_absent') return '#e5e7eb'
    if (status === 'sick_certified') return '#dcfce7'
    if (status === 'approved_leave') return '#dbeafe'
    if (status === 'short_day_authorised') return '#ffffff'
    if (status === 'resolved_error') return '#fef3c7'
    if (status === 'conflict') return '#fed7aa'
    if (dayType === 'public_holiday') return '#fecaca'
    if (dayType === 'rest_day') return '#fef3c7'
    return '#ffffff'
  }

  function cellLabel(workerId, day) {
    const key = `${workerId}_${day}`
    const cell = grid[key]
    if (!cell) return null
    if (cell.absence_status === 'unauthorised_absent') return 'UA'
    if (cell.absence_status === 'approved_leave') return cell.approved_leave_type ? cell.approved_leave_type.charAt(0).toUpperCase() + cell.approved_leave_type.slice(1) : 'Leave'
    return null
  }

  if (loading && clientId) return <AppShell pageTitle="Timesheet Grid"><div style={{padding:40,textAlign:'center'}}>Loading grid...</div></AppShell>

  const clientName = clients.find(c => c.id === clientId)?.name || ''

  return (
    <AppShell pageTitle="Timesheet Grid">
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,color:'#0891b2',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Master Timesheet Grid</div>
        <h1 style={{fontSize:20,fontWeight:700,color:'#0f172a',margin:0}}>{clientName || 'Select a client'} {clientName ? `\u2014 ${MONTH_NAMES[month-1]} ${year}` : ''}</h1>
      </div>
      {supplierFilter && (
        <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#0f766e',marginBottom:12}}>
          Supplier filter is active. The grid is showing only active workers linked to that supplier company.
        </div>
      )}

      {/* Toolbar */}
      <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',marginBottom:16,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px'}}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{border:'1px solid #cbd5e1',borderRadius:6,padding:'4px 8px',fontSize:12}}>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{border:'1px solid #cbd5e1',borderRadius:6,padding:'4px 8px',fontSize:12}}>
          {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={clientId} onChange={e => setClientId(e.target.value)} style={{border:'1px solid #cbd5e1',borderRadius:6,padding:'4px 8px',fontSize:12,maxWidth:220}}>
          <option value="">Select client...</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.is_internal ? '\u2605 ' : ''}{c.name}</option>)}
        </select>
        <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12,cursor:'pointer'}}>
          <input type="checkbox" checked={ramadanMode} onChange={e => toggleRamadan(e.target.checked)} />
          Ramadan (6hr)
        </label>
        <div style={{flex:1}} />
        {conflictCount > 0 && <span style={{fontSize:12,fontWeight:600,color:'#c2410c',background:'#ffedd5',padding:'3px 10px',borderRadius:12}}>\u26a0 {conflictCount} conflict{conflictCount > 1 ? 's' : ''}</span>}
        <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer'}}>
          <input type="checkbox" checked={showConflictsOnly} onChange={e => setShowConflictsOnly(e.target.checked)} />
          Show only conflicts
        </label>
        {canEdit && !locked && <>
          <label style={{display:'inline-block',padding:'4px 10px',background:'#e0f2fe',color:'#0369a1',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600}}>
            Upload Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleExcelUpload} />
          </label>
          <button onClick={handleSaveAll} style={{padding:'4px 10px',background:'#0d9488',color:'white',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>Save All</button>
        </>}
        <button disabled={conflictCount > 0 || locked || !canEdit}
          title={conflictCount > 0 ? `Resolve all ${conflictCount} conflicts before generating payroll` : locked ? 'Payroll already generated' : ''}
          onClick={handleGeneratePayroll}
          style={{padding:'4px 12px',background: conflictCount > 0 || locked ? '#94a3b8' : '#1e3a8a',color:'white',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor: conflictCount > 0 || locked ? 'not-allowed' : 'pointer'}}>
          {locked ? 'Payroll Locked' : 'Generate Payroll'}
        </button>
      </div>

      {locked && <div style={{background:'#fef2f2',border:'2px solid #fca5a5',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,color:'#991b1b',fontWeight:600}}>Payroll has been generated for {MONTH_NAMES[month-1]} {year}. Grid is read-only. Contact Owner to unlock.</div>}

      {uploadResult && (
        <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:12}}>
          Excel imported: {uploadResult.matched}/{uploadResult.total} workers matched.
          {uploadResult.unmatched.length > 0 && <div style={{color:'#c2410c',marginTop:4}}>Unmatched: {uploadResult.unmatched.join(', ')}</div>}
          <button onClick={() => setUploadResult(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#64748b',marginLeft:8}}>Dismiss</button>
        </div>
      )}

      {!clientId ? (
        <div style={{textAlign:'center',padding:60,color:'#64748b'}}>Select a client from the toolbar to load the timesheet grid.</div>
      ) : workers.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:'#64748b'}}>No workers found for this client. {clientId === INNOVATION_INTERNAL_ID ? 'No active Permanent Staff workers exist.' : 'Workers may not be assigned to this client.'}</div>
      ) : (
        <div style={{overflowX:'auto',border:'1px solid #e2e8f0',borderRadius:8,background:'white'}}>
          <table style={{borderCollapse:'collapse',fontSize:10,width:'100%',minWidth: numDays * 30 + 300,tableLayout:'fixed'}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                <th style={{position:'sticky',left:0,background:'#f8fafc',zIndex:2,padding:'5px 7px',textAlign:'left',borderRight:'2px solid #e2e8f0',width:148,fontSize:10,fontWeight:600}}>Worker</th>
                {Array.from({ length: numDays }, (_, i) => {
                  const day = i + 1
                  const dateStr = formatDateStr(day, month, year)
                  const d = new Date(dateStr + 'T00:00:00')
                  const dow = d.getDay()
                  const holName = getHolidayName(dateStr, holidays)
                  const isRest = (dow === 0) // Default sunday check for header
                  const isHol = !!holName
                  const bg = isHol ? '#fecaca' : isRest ? '#fef3c7' : '#f8fafc'
                  return (
                    <th key={day} title={holName || ''} style={{padding:'3px 1px',textAlign:'center',background: bg,borderBottom:'1px solid #e2e8f0',width:30,fontSize:9}}>
                      <div>{day}</div>
                      <div style={{fontSize:8,color:'#94a3b8'}}>{DAY_LETTERS[dow]}</div>
                      {isHol && <div style={{fontSize:7,color:'#dc2626',lineHeight:1}}>{holName.length > 6 ? holName.slice(0,6)+'..' : holName}</div>}
                    </th>
                  )
                })}
                <th style={{padding:'4px 4px',textAlign:'center',background:'#f0fdfa',borderLeft:'2px solid #e2e8f0',fontSize:9,width:38}}>Norm</th>
                <th style={{padding:'4px 4px',textAlign:'center',background:'#fef9c3',fontSize:9,width:34}}>OT1</th>
                <th style={{padding:'4px 4px',textAlign:'center',background:'#fee2e2',fontSize:9,width:34}}>OT2</th>
                <th style={{padding:'4px 4px',textAlign:'center',background:'#f0fdfa',borderRight:'none',fontSize:9,width:38}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => {
                const wTotals = workerTotals[worker.id] || { normal: 0, ot: 0, holiday: 0, total: 0 }
                const hasConflict = Array.from({ length: numDays }, (_, i) => grid[`${worker.id}_${i+1}`]?.absence_status === 'conflict').some(Boolean)
                if (showConflictsOnly && !hasConflict) return null
                return (
                  <tr key={worker.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{position:'sticky',left:0,background:'white',zIndex:1,padding:'5px 7px',borderRight:'2px solid #e2e8f0',fontSize:10}}>
                      <div style={{fontWeight:600,lineHeight:1.15}}>{worker.full_name}</div>
                      <div style={{fontSize:9,color:'#94a3b8',fontFamily:'monospace'}}>{worker.worker_number}</div>
                    </td>
                    {Array.from({ length: numDays }, (_, i) => {
                      const day = i + 1
                      const key = `${worker.id}_${day}`
                      const cell = grid[key]
                      const bg = cellBg(worker.id, day)
                      const label = cellLabel(worker.id, day)
                      const state = cellStates[key]
                      const isConflict = cell?.absence_status === 'conflict'
                      const isResolved = cell?.absence_status && cell.absence_status !== 'conflict'
                      const val = cell?.total_hours ?? ''

                      return (
                        <td key={day} style={{padding:1,position:'relative',background: bg,borderRight:'1px solid #f1f5f9'}}>
                          {isResolved ? (
                            <div style={{width:'100%',height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600,cursor:'pointer',color: cell.absence_status === 'unauthorised_absent' ? '#6b7280' : cell.absence_status === 'sick_certified' ? '#166534' : cell.absence_status === 'approved_leave' ? '#1e40af' : '#475569'}}
                              title={cell.absence_status === 'sick_certified' ? `Sick cert: ${cell.sick_cert_reference || ''}` : cell.absence_status}>
                              {cell.absence_status === 'sick_certified' && '\ud83c\udfe5'}
                              {cell.absence_status === 'short_day_authorised' && '\u2713'}
                              {label || (val > 0 ? val : '')}
                            </div>
                          ) : (
                            <div style={{position:'relative'}}>
                              <input type="number" step="0.5" min="0" max="16"
                                value={val === 0 && !cell?._saved ? '' : val}
                                disabled={locked || !canEdit}
                                onChange={e => handleCellChange(worker.id, day, e.target.value)}
                                onBlur={e => { if (e.target.value !== '') handleCellChange(worker.id, day, capHours(e.target.value)) }}
                                style={{width:'100%',height:24,textAlign:'center',border: state === 'editing' ? '2px solid #eab308' : state === 'error' ? '2px solid #dc2626' : '1px solid transparent',borderRadius:3,background:'transparent',fontSize:10,outline:'none',padding:0,color: isConflict ? '#c2410c' : '#0f172a'}} />
                              {isConflict && <span style={{position:'absolute',top:0,right:1,fontSize:9,cursor:'pointer'}} onClick={() => setActivePopover(key)}>{'\u26a0'}</span>}
                              {state === 'saving' && <span style={{position:'absolute',bottom:0,right:1,fontSize:7,color:'#94a3b8'}}>...</span>}
                              {state === 'error' && <span style={{position:'absolute',bottom:0,right:1,fontSize:7,color:'#dc2626',cursor:'pointer'}} onClick={() => saveCell(worker.id, day, val)}>\u21bb</span>}
                            </div>
                          )}
                          {/* Conflict resolution popover */}
                          {activePopover === key && (
                            <div style={{position:'absolute',top:30,left:-60,zIndex:50,background:'white',border:'1px solid #e2e8f0',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.15)',padding:6,width:200,fontSize:11}} onClick={e => e.stopPropagation()}>
                              <div style={{fontWeight:700,marginBottom:4,color:'#c2410c',fontSize:10}}>Resolve conflict — Day {day}</div>
                              {[
                                { label: 'UA (Unauthorised Absent)', action: () => resolveConflict(worker.id, day, 'unauthorised_absent') },
                                { label: 'Sick \u2014 with certificate', action: () => { setShowSickModal(key); setActivePopover(null) } },
                                { label: 'Approved Leave \u2014 Annual', action: () => resolveLeave(worker.id, day, 'annual') },
                                { label: 'Approved Leave \u2014 Emergency', action: () => resolveLeave(worker.id, day, 'emergency') },
                                { label: 'Approved Leave \u2014 Unpaid', action: () => resolveLeave(worker.id, day, 'unpaid') },
                                { label: 'Short day \u2014 authorised', action: () => resolveConflict(worker.id, day, 'short_day_authorised') },
                                { label: 'Error \u2014 enter correct hours', action: () => { const h = prompt('Enter correct hours:'); if (h !== null) resolveCorrectHours(worker.id, day, h); setActivePopover(null) } },
                                { label: 'Public holiday (not in system)', action: () => resolveConflict(worker.id, day, 'resolved_error') },
                              ].map((opt, idx) => (
                                <button key={idx} onClick={opt.action} style={{display:'block',width:'100%',textAlign:'left',padding:'4px 6px',border:'none',background:'transparent',cursor:'pointer',fontSize:11,borderRadius:4,color:'#334155'}}
                                  onMouseEnter={e => e.target.style.background='#f1f5f9'} onMouseLeave={e => e.target.style.background='transparent'}>
                                  {opt.label}
                                </button>
                              ))}
                              <button onClick={() => setActivePopover(null)} style={{display:'block',width:'100%',textAlign:'center',padding:'3px',border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:10,borderRadius:4,marginTop:4,color:'#64748b'}}>Cancel</button>
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{textAlign:'center',fontSize:11,fontWeight:500,background:'#f0fdfa',borderLeft:'2px solid #e2e8f0',padding:'0 4px'}}>{wTotals.normal}</td>
                    <td style={{textAlign:'center',fontSize:11,fontWeight:500,background:'#fef9c3',color:'#92400e',padding:'0 4px'}}>{wTotals.ot}</td>
                    <td style={{textAlign:'center',fontSize:11,fontWeight:500,background:'#fee2e2',color:'#991b1b',padding:'0 4px'}}>{wTotals.holiday}</td>
                    <td style={{textAlign:'center',fontSize:11,fontWeight:700,background:'#f0fdfa',padding:'0 4px'}}>{wTotals.total}</td>
                  </tr>
                )
              })}
              {/* Daily totals row */}
              <tr style={{background:'#f8fafc',borderTop:'2px solid #e2e8f0'}}>
                <td style={{position:'sticky',left:0,background:'#f8fafc',zIndex:1,padding:'6px 8px',borderRight:'2px solid #e2e8f0',fontSize:11,fontWeight:700}}>Daily Total</td>
                {Array.from({ length: numDays }, (_, i) => {
                  const day = i + 1
                  const dayTotal = workers.reduce((sum, w) => sum + (grid[`${w.id}_${day}`]?.total_hours || 0), 0)
                  return <td key={day} style={{textAlign:'center',fontSize:10,fontWeight:600,padding:'4px 2px',borderRight:'1px solid #f1f5f9'}}>{dayTotal > 0 ? Math.round(dayTotal * 10) / 10 : ''}</td>
                })}
                <td colSpan={4} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Sick cert modal */}
      {showSickModal && (() => {
        const [wid, dayStr] = showSickModal.split('_')
        const day = parseInt(dayStr)
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setShowSickModal(null)}>
            <div style={{background:'white',borderRadius:10,padding:24,width:380,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}} onClick={e => e.stopPropagation()}>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Sick Certificate \u2014 Day {day}</h3>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Certificate reference number *</label>
                <input type="text" value={sickRefInput} onChange={e => setSickRefInput(e.target.value)}
                  placeholder="e.g. DHA-2026-12345"
                  style={{width:'100%',border:'1px solid #cbd5e1',borderRadius:6,padding:'8px 10px',fontSize:13}} />
              </div>
              <div style={{marginBottom:16,padding:'8px 12px',background:'#f1f5f9',borderRadius:6,fontSize:11,color:'#64748b'}}>
                PDF upload coming in PR #10 \u2014 enter reference number for now.
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button onClick={() => { setShowSickModal(null); setSickRefInput('') }} style={{padding:'6px 14px',border:'1px solid #cbd5e1',background:'white',borderRadius:6,fontSize:12,cursor:'pointer'}}>Cancel</button>
                <button onClick={() => resolveSick(wid, day, sickRefInput)} disabled={!sickRefInput.trim()}
                  style={{padding:'6px 14px',background: sickRefInput.trim() ? '#0d9488' : '#94a3b8',color:'white',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor: sickRefInput.trim() ? 'pointer' : 'not-allowed'}}>Save</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Close popover on outside click */}
      {activePopover && <div style={{position:'fixed',inset:0,zIndex:40}} onClick={() => setActivePopover(null)} />}
    </AppShell>
  )
}

export default function TimesheetGridPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading timesheet grid...</div>}>
      <TimesheetGridContent />
    </Suspense>
  )
}

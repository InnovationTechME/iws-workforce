'use client'
import React, { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import StatusBadge from '../../components/StatusBadge'
import {
  getTimesheetHeaders, getAllTimesheetLines,
  getVisibleWorkers, getAllPayrollBatches,
  getPayrollLinesByBatch, updatePayrollBatch,
  getAllDiscrepancies, resolveDiscrepancy,
  isPublicHoliday, getHolidayName,
  getRamadanMode, makeId,
  getPenaltyDeductions, confirmPenaltyDeduction, removePenaltyDeduction,
  addPayrollAdjustment, getPayrollAdjustments,
  getPendingCarryOverNotes, resolveCarryOverNote, getWorker,
  lockPayrollBatch, approvePayrollBatchOwner
} from '../../lib/mockStore'
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
  const [conflicts, setConflicts] = useState([])
  const [selectedConflict, setSelectedConflict] = useState(null)
  const [conflictDrawerOpen, setConflictDrawerOpen] = useState(false)
  const [conflictResolution, setConflictResolution] = useState('use_iws')
  const [conflictCustomHours, setConflictCustomHours] = useState('')
  const [conflictNote, setConflictNote] = useState('')
  const [conflictSaving, setConflictSaving] = useState(false)
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState('all')
  const [step1Confirmed, setStep1Confirmed] = useState(false)
  const [role, setRole] = useState('owner')
  const [successMsg, setSuccessMsg] = useState(null)
  const [expandedWorker, setExpandedWorker] = useState(null)
  const [adjForm, setAdjForm] = useState({worker_id:'',type:'deduction',label:'',amount:''})
  const [showAdjPanel, setShowAdjPanel] = useState(false)
  const [penalties, setPenalties] = useState([])
  const [carryOverNotes, setCarryOverNotes] = useState([])
  const [step2Confirmed, setStep2Confirmed] = useState(false)
  const [payrollAdjustments, setPayrollAdjustments] = useState([])
  const [step3Approved, setStep3Approved] = useState(false)
  const [opsRejected, setOpsRejected] = useState(false)
  const [opsRejectionNote, setOpsRejectionNote] = useState('')
  const [showOpsRejectModal, setShowOpsRejectModal] = useState(false)
  const [opsRejectDraft, setOpsRejectDraft] = useState('')
  const [hrReplyToOps, setHrReplyToOps] = useState('')
  const [showHrReplyPanel, setShowHrReplyPanel] = useState(false)
  const [flaggedWorkers, setFlaggedWorkers] = useState({})
  const [flagNote, setFlagNote] = useState('')
  const [flaggingWorker, setFlaggingWorker] = useState(null)
  const [step4Approved, setStep4Approved] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalChecklist, setApprovalChecklist] = useState({conflicts:false,penalties:false,opsApproved:false,carryOver:false,wpsReviewed:false})
  const [payrollExecuted, setPayrollExecuted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState([])

  const loadBatchData = (batch) => {
    setPayrollLines(getPayrollLinesByBatch(batch.id))
    const hdrs = getTimesheetHeaders()
    setTimesheetHeaders(hdrs)
    if (hdrs.length > 0 && !selectedHeader) setSelectedHeader(hdrs[0])
    setAllLines(getAllTimesheetLines())
    setPenalties(getPenaltyDeductions())
    setCarryOverNotes(getPendingCarryOverNotes())
    setPayrollAdjustments(getPayrollAdjustments(batch.id, null))
    if (batch.step2_confirmed) { setStep2Confirmed(true); setStepStatus(prev => ({...prev,1:'complete',2:'complete',3:batch.ops_approval_status==='approved'?'complete':'active'})) }
    if (batch.ops_approval_status === 'approved') { setStep3Approved(true); setStepStatus(prev => ({...prev,3:'complete',4:'active'})) }
    if (batch.ops_rejected) { setOpsRejected(true); setOpsRejectionNote(batch.ops_rejection_note||'') }
    if (batch.owner_approval_status === 'approved') { setStep4Approved(true); setPayrollExecuted(true); setStepStatus(prev => ({...prev,4:'complete',5:'complete'})) }
    setApprovalChecklist({conflicts:(getAllDiscrepancies().filter(d=>d.status==='pending'||d.status==='hr_clarified').length===0),penalties:(getPenaltyDeductions().filter(p=>p.status==='pending_hr_confirmation').length===0),opsApproved:batch.ops_approval_status==='approved',carryOver:getPendingCarryOverNotes().length===0,wpsReviewed:true})
  }

  const refreshConflicts = () => setConflicts(getAllDiscrepancies())

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  const handleBatchChange = (month) => {
    const batch = allBatches.find(b => b.month === month)
    if (batch) { setSelectedBatch(batch); loadBatchData(batch); setStep1Confirmed(false); setCurrentStep(1); setStepStatus({1:'active',2:'locked',3:'locked',4:'locked',5:'locked'}) }
  }

  const calculateWorkerPayroll = (worker) => {
    const isFlat = worker.category === 'Contract Worker' || worker.category === 'Subcontract Worker'
    const workerLines = allLines.filter(l => l.worker_id === worker.id)
    const totalHours = workerLines.reduce((s,l) => s+(l.total_hours||0), 0)
    const normalHours = workerLines.reduce((s,l) => s+(l.normal_hours||0), 0)
    const ot1Hours = workerLines.reduce((s,l) => s+(l.ot_hours||0), 0)
    const ot2Hours = workerLines.reduce((s,l) => s+(l.holiday_hours||0), 0)
    let basicPay=0, ot1Pay=0, ot2Pay=0, allowances=0, baseRate=0
    if (isFlat) { basicPay=totalHours*(worker.hourly_rate||0); baseRate=worker.hourly_rate||0; ot2Pay=ot2Hours*(worker.hourly_rate||0)*0.50 }
    else { basicPay=worker.monthly_salary||0; baseRate=basicPay/30/8; ot1Pay=Math.round(ot1Hours*baseRate*1.25*100)/100; ot2Pay=Math.round(ot2Hours*baseRate*1.50*100)/100; allowances=(worker.housing_allowance||0)+(worker.transport_allowance||0)+(worker.food_allowance||0) }
    const grossPay = Math.round((basicPay+ot1Pay+ot2Pay+allowances)*100)/100
    const workerPenalties = penalties.filter(p => p.worker_id===worker.id && p.status==='confirmed')
    const penaltyTotal = workerPenalties.reduce((s,p) => s+p.amount, 0)
    const workerAdjs = payrollAdjustments.filter(a => a.worker_id===worker.id)
    const adjDeductions = workerAdjs.filter(a => a.adjustment_type==='deduction'||a.adjustment_type==='advance').reduce((s,a) => s+a.amount, 0)
    const adjAllowances = workerAdjs.filter(a => a.adjustment_type==='allowance').reduce((s,a) => s+a.amount, 0)
    const totalDeductions = Math.round((penaltyTotal+adjDeductions)*100)/100
    const netPay = Math.round((grossPay+adjAllowances-totalDeductions)*100)/100
    return { worker, isFlat, isOffice:worker.category==='Office Staff', totalHours, normalHours, ot1Hours, ot2Hours, basicPay, baseRate:Math.round(baseRate*100)/100, ot1Pay, ot2Pay, allowances, grossPay, penaltyTotal, adjDeductions, adjAllowances, totalDeductions, netPay, workerPenalties, workerAdjs, paymentMethod:worker.payment_method||'WPS' }
  }

  const calculatePayrollTotals = () => {
    const activeWorkers = workers.filter(w => w.active !== false)
    const calcs = activeWorkers.map(w => calculateWorkerPayroll(w))
    return {
      totalGross: Math.round(calcs.reduce((s,c) => s+c.grossPay, 0)*100)/100,
      totalNet: Math.round(calcs.reduce((s,c) => s+c.netPay, 0)*100)/100,
      totalDeductions: Math.round(calcs.reduce((s,c) => s+c.totalDeductions, 0)*100)/100,
      wpsTotal: Math.round(calcs.filter(c => c.paymentMethod==='WPS'||!c.paymentMethod).reduce((s,c) => s+c.netPay, 0)*100)/100,
      nonWpsTotal: Math.round(calcs.filter(c => c.paymentMethod==='Non-WPS').reduce((s,c) => s+c.netPay, 0)*100)/100,
      cashTotal: Math.round(calcs.filter(c => c.paymentMethod==='Cash').reduce((s,c) => s+c.netPay, 0)*100)/100,
      workerCount: activeWorkers.length,
      calcs
    }
  }

  const generatePayslipHTML = (worker, calc, batchLabel) => {
    const isFlat = calc.isFlat
    const monthAbbr = batchLabel?.split(' ')[0]?.slice(0,3)||'Apr'
    const year = batchLabel?.split(' ')[1]||'2026'
    const psRef = `IT-PS-${monthAbbr}-${year}-${worker.worker_number}`
    const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
    const payment = worker.payment_method==='Cash'?'Cash':'C3 Card (WPS via Endered)'
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent('IT-PS:'+psRef+':'+worker.worker_number)}&margin=2`

    const earningsRows = isFlat ? `
      <tr><td style="padding:5px 0;font-size:9pt;color:#334155">Hourly Rate</td><td style="padding:5px 0;font-size:9pt;text-align:right">AED ${worker.hourly_rate}/hr</td></tr>
      <tr><td style="padding:5px 0;font-size:9pt;color:#334155">Hours Worked</td><td style="padding:5px 0;font-size:9pt;text-align:right">${calc.totalHours}h</td></tr>
      <tr><td style="padding:5px 0;font-size:9pt;color:#334155">Standard Pay (${calc.totalHours}h × AED ${worker.hourly_rate})</td><td style="padding:5px 0;font-size:9pt;text-align:right;font-weight:600">AED ${calc.basicPay.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>
      ${calc.ot2Hours>0?`<tr><td style="padding:5px 0;font-size:9pt;color:#dc2626">Holiday Premium (${calc.ot2Hours}h × ×0.50)</td><td style="padding:5px 0;font-size:9pt;color:#dc2626;text-align:right">AED ${calc.ot2Pay.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>`:''}
    ` : `
      <tr><td style="padding:5px 0;font-size:9pt;color:#334155">Basic Salary</td><td style="padding:5px 0;font-size:9pt;font-weight:700;text-align:right">AED ${(worker.monthly_salary||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>
      ${calc.allowances>0?`<tr><td style="padding:5px 0;font-size:9pt;color:#16a34a">Allowances</td><td style="padding:5px 0;font-size:9pt;color:#16a34a;text-align:right">AED ${calc.allowances.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>`:''}
      ${calc.ot1Hours>0?`<tr><td style="padding:5px 0;font-size:9pt;color:#d97706">OT Weekday (${calc.ot1Hours}h × AED ${calc.baseRate.toFixed(2)} × 1.25)</td><td style="padding:5px 0;font-size:9pt;color:#d97706;text-align:right">AED ${calc.ot1Pay.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>`:''}
      ${calc.ot2Hours>0?`<tr><td style="padding:5px 0;font-size:9pt;color:#dc2626">OT Fri/Holiday (${calc.ot2Hours}h × AED ${calc.baseRate.toFixed(2)} × 1.50)</td><td style="padding:5px 0;font-size:9pt;color:#dc2626;text-align:right">AED ${calc.ot2Pay.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>`:''}
    `

    const deductionRows = calc.totalDeductions > 0 ? (calc.workerPenalties||[]).map(p=>`<tr><td style="padding:4px 0;font-size:9pt;color:#dc2626">${p.label}</td><td style="padding:4px 0;font-size:9pt;color:#dc2626;text-align:right">-AED ${p.amount.toFixed(2)}</td></tr>`).join('') + (calc.workerAdjs||[]).filter(a=>a.adjustment_type!=='allowance').map(a=>`<tr><td style="padding:4px 0;font-size:9pt;color:#dc2626">${a.label}</td><td style="padding:4px 0;font-size:9pt;color:#dc2626;text-align:right">-AED ${a.amount.toFixed(2)}</td></tr>`).join('') : ''

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payslip - ${worker.full_name}</title>
<style>@page{size:A5 portrait;margin:8mm}body{font-family:Arial,sans-serif;font-size:9pt;color:#0f172a;width:148mm;margin:0 auto}table{width:100%;border-collapse:collapse}.section-title{font-size:8pt;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #3b82f6;padding-bottom:3px;margin:10px 0 6px}</style></head><body>
<table style="margin-bottom:8px"><tr><td style="width:40px"><div style="width:34px;height:34px;background:#1e3a8a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14pt;text-align:center;line-height:34px">iN</div></td><td style="padding-left:8px"><div style="font-size:11pt;font-weight:700">Innovation Technologies LLC O.P.C.</div><div style="font-size:7pt;color:#64748b">Workhub, M21, Musaffah, Abu Dhabi, UAE</div></td><td style="text-align:right;vertical-align:top"><div style="font-size:7pt;color:#64748b">+971 2 333 6633 · info@innovationtech.me</div><div style="font-size:6.5pt;color:#94a3b8;font-family:monospace">${psRef}</div></td></tr></table>
<div style="border-bottom:1.5px solid #1e3a8a;margin-bottom:8px"></div>
<div style="text-align:center;margin-bottom:8px"><div style="font-size:13pt;font-weight:700;letter-spacing:2px">PAYSLIP <span style="font-size:10pt;color:#94a3b8;font-weight:400">/ كشف الراتب</span></div><div style="font-size:9pt;color:#64748b;margin-top:2px">${batchLabel}</div></div>
<table style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;font-size:9pt"><tr><td style="padding:3px 8px"><div style="color:#94a3b8;font-size:7.5pt">Employee</div><div style="font-weight:700">${worker.full_name}</div></td><td style="padding:3px 8px"><div style="color:#94a3b8;font-size:7.5pt">Worker ID</div><div style="font-family:monospace">${worker.worker_number}</div></td><td style="padding:3px 8px"><div style="color:#94a3b8;font-size:7.5pt">Trade</div><div>${worker.trade_role}</div></td></tr><tr><td style="padding:3px 8px"><div style="color:#94a3b8;font-size:7.5pt">Nationality</div><div>${worker.nationality}</div></td><td style="padding:3px 8px"><div style="color:#94a3b8;font-size:7.5pt">Period</div><div>${batchLabel}</div></td><td style="padding:3px 8px"><div style="color:#94a3b8;font-size:7.5pt">Payment</div><div style="font-weight:600;color:#1e3a8a">${payment}</div></td></tr></table>
<div class="section-title">Earnings</div><table>${earningsRows}<tr style="border-top:1.5px solid #e2e8f0"><td style="padding:6px 0;font-size:10pt;font-weight:700">Gross Earnings</td><td style="padding:6px 0;font-size:10pt;font-weight:700;text-align:right">AED ${calc.grossPay.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr></table>
${calc.totalDeductions>0?`<div class="section-title" style="color:#dc2626;border-color:#fca5a5">Deductions</div><table>${deductionRows}<tr style="border-top:1px solid #fca5a5"><td style="padding:6px 0;font-size:9pt;font-weight:700;color:#dc2626">Total Deductions</td><td style="padding:6px 0;font-size:9pt;font-weight:700;color:#dc2626;text-align:right">-AED ${calc.totalDeductions.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr></table>`:''}
<div style="background:#0f172a;border-radius:6px;padding:12px 14px;margin:10px 0;display:flex;justify-content:space-between;align-items:center"><div><div style="color:rgba(255,255,255,0.6);font-size:8pt;margin-bottom:2px">NET PAY / صافي الراتب</div><div style="color:#93c5fd;font-size:7.5pt">${payment}</div></div><div style="font-size:16pt;font-weight:800;color:#60a5fa">AED ${calc.netPay.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
<table style="margin-top:10px;font-size:8pt"><tr><td style="width:50%;vertical-align:top"><div style="font-weight:600;margin-bottom:6px">For Innovation Technologies LLC O.P.C.</div><div style="color:#64748b;font-size:7.5pt;margin-bottom:14px">Authorised Signatory</div><div style="border-top:1px solid #cbd5e1;padding-top:4px;color:#94a3b8;font-size:7.5pt">Name &amp; Signature</div></td><td style="text-align:right;vertical-align:bottom"><img src="${qrUrl}" alt="Verify" style="width:55px;height:55px;display:block;margin-left:auto" /><div style="font-size:6.5pt;color:#94a3b8;margin-top:3px">Scan to verify</div></td></tr></table>
<div style="border-top:1px solid #e2e8f0;margin-top:8px;padding-top:6px;text-align:center;font-size:7pt;color:#94a3b8">Digitally generated by IWS · ${today} · ${psRef}</div>
<div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:4px;text-align:center;font-size:6.5pt;color:#94a3b8">Innovation Technologies LLC O.P.C. · Workhub M21 Musaffah Abu Dhabi · Licence: CN-5087790 · VAT: 104184776300003 · MOHRE: 1979124 · Confidential</div>
</body></html>`
  }

  const generateWPSExcel = async () => {
    const XLSX = (await import('xlsx'))
    const totals = calculatePayrollTotals()
    const batchLabel = selectedBatch?.month_label||'April 2026'
    const wpsData = totals.calcs.filter(c=>c.paymentMethod==='WPS'||!c.paymentMethod).map(c=>({'IT Employee ID':c.worker.worker_number,'Full Name':c.worker.full_name,'Nationality':c.worker.nationality||'','Trade / Position':c.worker.trade_role,'Category':c.worker.category,'Pay Type':c.isFlat?'Hourly Rate':'Monthly Salary','Basic Salary / Rate':c.isFlat?c.worker.hourly_rate:(c.worker.monthly_salary||0),'Total Hours':c.isFlat?c.totalHours:'','Housing Allowance':c.isFlat?0:(c.worker.housing_allowance||0),'Transport Allowance':c.isFlat?0:(c.worker.transport_allowance||0),'Food Allowance':c.isFlat?0:(c.worker.food_allowance||0),'Total Allowances':c.isFlat?0:c.allowances,'OT1 Hours (×1.25)':c.ot1Hours||0,'OT1 Pay':c.ot1Pay||0,'OT2 Hours (×1.50)':c.ot2Hours||0,'OT2 Pay':c.ot2Pay||0,'Gross Pay':c.grossPay,'Deductions':c.totalDeductions,'Net Pay':c.netPay,'Payment Method':'WPS — C3 Card (Endered)','C3 Card Status':c.c3Status||'Not set','Worker Email':c.worker.email||'','WhatsApp':c.worker.whatsapp_number||''}))
    const nonWpsData = totals.calcs.filter(c=>c.paymentMethod==='Non-WPS'||c.paymentMethod==='Cash').map(c=>({'IT Employee ID':c.worker.worker_number,'Full Name':c.worker.full_name,'Nationality':c.worker.nationality||'','Trade':c.worker.trade_role,'Gross Pay':c.grossPay,'Deductions':c.totalDeductions,'Net Pay':c.netPay,'Payment':c.paymentMethod,'Email':c.worker.email||''}))
    const summaryData = [{'Section':'GRAND TOTAL','Amount':totals.totalNet,'WPS/Non-WPS':`WPS: AED ${totals.wpsTotal.toLocaleString()} | Non-WPS: AED ${totals.nonWpsTotal.toLocaleString()} | Cash: AED ${totals.cashTotal.toLocaleString()}`,'Workers':totals.workerCount}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(wpsData),'WPS Workers')
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(nonWpsData.length>0?nonWpsData:[{Note:'No Non-WPS workers'}]),'Non-WPS')
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summaryData),'Summary')
    XLSX.writeFile(wb,`Innovation_Payroll_${batchLabel.replace(' ','_')}.xlsx`)
  }

  const generatePayslipsZip = async () => {
    setGenerating(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const batchLabel = selectedBatch?.month_label||'April 2026'
      const monthYear = batchLabel.replace(' ','_')
      const folder = zip.folder(monthYear+'_Payslips')
      const totals = calculatePayrollTotals()
      for (const calc of totals.calcs) {
        const html = generatePayslipHTML(calc.worker,calc,batchLabel)
        const safeName = calc.worker.full_name.replace(/\s+/g,'')
        folder.file(`${calc.worker.worker_number}_${safeName}_${monthYear}.html`,html)
      }
      folder.file('MANIFEST.txt',`Innovation Technologies LLC\nPayslip Batch: ${batchLabel}\nGenerated: ${new Date().toLocaleDateString('en-GB')}\nWorkers: ${totals.calcs.length}`)
      const blob = await zip.generateAsync({type:'blob'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href=url;a.download=`Innovation_Payslips_${monthYear}.zip`;a.click()
      URL.revokeObjectURL(url)
      showSuccess(`Downloaded ${totals.calcs.length} payslips as ZIP`)
      setGeneratedFiles(prev=>[...prev,'Payslips ZIP'])
    } catch(err) { console.error('ZIP error:',err) }
    setGenerating(false)
  }

  useEffect(() => {
    setRole(getRole())
    setWorkers(getVisibleWorkers().filter(w => w.active !== false))
    const batches = getAllPayrollBatches()
    setAllBatches(batches)
    const activeBatch = batches.find(b => !b.locked) || batches[0]
    if (activeBatch) { setSelectedBatch(activeBatch); loadBatchData(activeBatch) }
    refreshConflicts()
  }, [])

  const steps = [
    {number:1,title:'Timesheet Review',subtitle:'Verify hours & resolve conflicts',icon:'📋'},
    {number:2,title:'Payroll Calculation',subtitle:'Review earnings & deductions',icon:'💰'},
    {number:3,title:'Operations Approval',subtitle:'Operations confirms hours',icon:'🏗'},
    {number:4,title:'Management Approval',subtitle:'Final sign-off',icon:'✅'},
    {number:5,title:'Run & Distribute',subtitle:'Generate files & payslips',icon:'⚡'}
  ]

  const completedCount = Object.values(stepStatus).filter(s => s === 'complete').length
  const pendingConflicts = conflicts.filter(c => c.status === 'pending' || c.status === 'hr_clarified').length

  // ── Step 1 component ──
  const Step1TimesheetReview = () => {
    if (!selectedBatch) return null
    const parts = (selectedBatch.month_label || 'April 2026').split(' ')
    const monthIndex = MONTH_NAMES.indexOf(parts[0])
    const yearNum = parseInt(parts[1]) || 2026
    const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate()

    const dayMeta = Array.from({length:daysInMonth},(_,i) => {
      const day = i+1
      const dateStr = `${yearNum}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const dateObj = new Date(yearNum, monthIndex, day)
      const dayOfWeek = dateObj.getDay()
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      return {day,dateStr,dayOfWeek,dayName:dayNames[dayOfWeek],isFriday:dayOfWeek===5,isSunday:dayOfWeek===0,isHoliday:isPublicHoliday(dateStr),holidayName:isPublicHoliday(dateStr)?getHolidayName(dateStr):null}
    })

    const filteredWorkers = selectedWorkerFilter === 'all'
      ? workers.filter(w => w.category !== 'Office Staff')
      : workers.filter(w => w.id === selectedWorkerFilter)

    const getIWSHours = (wId, dateStr) => { const l = allLines.find(l => l.worker_id === wId && l.work_date === dateStr); return l ? (l.total_hours||0) : null }
    const getClientHours = (wId, dateStr) => { const d = conflicts.find(c => c.worker_id === wId && c.date === dateStr); return d ? d.client_hours : null }
    const hasConflict = (wId, dateStr) => conflicts.some(c => c.worker_id === wId && (c.absent_date === dateStr || c.date === dateStr) && (c.status === 'pending' || c.status === 'hr_clarified'))
    const getConflictRecord = (wId, dateStr) => conflicts.find(c => c.worker_id === wId && (c.absent_date === dateStr || c.date === dateStr))

    const headerConflicts = conflicts.filter(c => (c.status === 'pending' || c.status === 'hr_clarified'))

    if (timesheetHeaders.length === 0) {
      return (<div className="panel" style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:48,marginBottom:12}}>📋</div>
        <h3>No timesheets uploaded for this period</h3>
        <p style={{color:'var(--muted)',marginBottom:16}}>Upload a client timesheet first before running payroll.</p>
        <a href="/timesheets" className="btn btn-primary">Go to Timesheets →</a>
      </div>)
    }

    return (<div>
      <InstructionBanner step={1} title="Timesheet Review" roleLabel="HR Admin"
        description="Review all worker hours for this pay period. Every conflict between IWS hours and client hours must be resolved before you can proceed to payroll calculation."
        howTo={['Each worker shows three rows: IWS hours (white), Client hours (blue), and any Conflict (red)','Click any red conflict cell to review the difference and choose which hours to use','Friday columns are highlighted amber — these attract 1.50× OT rate','Red column headers indicate UAE public holidays','Use the Print button at any time to print the full timesheet','Select a single worker from the dropdown to print or review individually','Once all conflicts show ✓ the green Confirm button will appear']} />

      {/* Filters */}
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <label style={{fontSize:12,color:'#64748b',fontWeight:600}}>Timesheet:</label>
          <select className="filter-select" value={selectedHeader?.id||''} onChange={e => { const h = timesheetHeaders.find(x => x.id === e.target.value); setSelectedHeader(h) }}>
            {timesheetHeaders.map(h => <option key={h.id} value={h.id}>{h.client_name} — {h.job_no} — {h.date?.slice(0,10)}</option>)}
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

      {/* Conflict counter */}
      {headerConflicts.length > 0 ? (
        <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:8,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700,color:'#dc2626',fontSize:14,marginBottom:4}}>⚠ {headerConflicts.length} CONFLICT{headerConflicts.length>1?'S':''} REMAINING</div>
            <div style={{fontSize:12,color:'#991b1b'}}>Click any red cell in the timesheet to review and resolve. All conflicts must be resolved before proceeding.</div>
          </div>
        </div>
      ) : (
        <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:8,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>✓</span>
          <div><div style={{fontWeight:600,color:'#16a34a',fontSize:13}}>All conflicts resolved</div><div style={{fontSize:12,color:'#15803d'}}>Timesheet is ready for confirmation</div></div>
        </div>
      )}

      {/* Grid */}
      <div id="timesheet-print-area" data-generated={new Date().toLocaleDateString('en-GB')} data-month={selectedBatch?.month_label} style={{overflowX:'auto',border:'1px solid #e2e8f0',borderRadius:8,background:'white',marginBottom:20}}>
        <table style={{borderCollapse:'collapse',minWidth:'100%',fontSize:11}}>
          <thead>
            <tr style={{background:'#f8fafc'}}>
              <th style={{position:'sticky',left:0,zIndex:3,background:'#f8fafc',width:160,padding:'8px 10px',textAlign:'left',borderRight:'2px solid #e2e8f0',borderBottom:'2px solid #e2e8f0',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5}}>Worker</th>
              <th style={{position:'sticky',left:160,zIndex:3,background:'#f8fafc',width:100,padding:'8px 8px',textAlign:'left',borderRight:'1px solid #e2e8f0',borderBottom:'2px solid #e2e8f0',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>Trade</th>
              <th style={{position:'sticky',left:260,zIndex:3,background:'#f8fafc',width:50,padding:'8px 6px',textAlign:'center',borderRight:'2px solid #cbd5e1',borderBottom:'2px solid #e2e8f0',fontSize:10,fontWeight:700,color:'#64748b'}}>Type</th>
              {dayMeta.map(dm => (
                <th key={dm.day} style={{width:38,minWidth:38,padding:'4px 2px',textAlign:'center',fontSize:9,fontWeight:700,borderBottom:'2px solid #e2e8f0',borderRight:'1px solid #f1f5f9',background:dm.isHoliday?'#fee2e2':dm.isFriday?'#fef3c7':'#f8fafc',color:dm.isHoliday?'#dc2626':dm.isFriday?'#d97706':'#64748b',title:dm.holidayName||(dm.isFriday?'Friday — OT ×1.50':'')}}>
                  <div>{dm.day}</div><div style={{fontSize:8,fontWeight:400}}>{dm.dayName}</div>{dm.isHoliday&&<div style={{fontSize:7}}>PH</div>}
                </th>
              ))}
              {[['Total','#0f172a'],['Normal','#64748b'],['OT1','#d97706'],['OT2','#dc2626'],['Gross','#0d9488']].map(([label,color]) => (
                <th key={label} style={{width:58,minWidth:58,padding:'8px 6px',textAlign:'right',fontSize:10,fontWeight:700,borderBottom:'2px solid #e2e8f0',borderLeft:label==='Total'?'2px solid #cbd5e1':'1px solid #f1f5f9',color,background:'#f8fafc'}}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map((worker,workerIdx) => {
              const workerLines = allLines.filter(l => l.worker_id === worker.id)
              const totalHrs = workerLines.reduce((s,l) => s+(l.total_hours||0),0)
              const normalHrs = workerLines.reduce((s,l) => s+(l.normal_hours||0),0)
              const ot1Hrs = workerLines.reduce((s,l) => s+(l.ot_hours||0),0)
              const ot2Hrs = workerLines.reduce((s,l) => s+(l.holiday_hours||0),0)
              const isFlat = worker.category==='Contract Worker'||worker.category==='Subcontract Worker'
              let grossPay = 0
              if (isFlat) { grossPay = totalHrs*(worker.hourly_rate||0) }
              else { const br=(worker.monthly_salary||0)/30/8; grossPay=(worker.monthly_salary||0)+ot1Hrs*br*1.25+ot2Hrs*br*1.50 }
              const hasAnyConflict = dayMeta.some(dm => hasConflict(worker.id,dm.dateStr))

              return (
                <React.Fragment key={worker.id}>
                  {/* IWS row */}
                  <tr style={{background:workerIdx%2===0?'white':'#fafafa',borderTop:workerIdx>0?'2px solid #f1f5f9':'none'}}>
                    <td rowSpan={3} style={{position:'sticky',left:0,zIndex:2,background:workerIdx%2===0?'white':'#fafafa',padding:'8px 10px',borderRight:'2px solid #e2e8f0',verticalAlign:'middle'}}>
                      <div style={{fontWeight:600,fontSize:12,color:'#0f172a'}}>{worker.full_name}</div>
                      <div style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>{worker.worker_number}</div>
                      {hasAnyConflict&&<div style={{fontSize:10,color:'#dc2626',fontWeight:600,marginTop:4}}>⚠ Has conflicts</div>}
                    </td>
                    <td rowSpan={3} style={{position:'sticky',left:160,zIndex:2,background:workerIdx%2===0?'white':'#fafafa',padding:'8px',borderRight:'1px solid #e2e8f0',verticalAlign:'middle',fontSize:11,color:'#334155'}}>{worker.trade_role}</td>
                    <td style={{position:'sticky',left:260,zIndex:2,background:workerIdx%2===0?'white':'#fafafa',padding:'4px 6px',textAlign:'center',borderRight:'2px solid #cbd5e1'}}>
                      <span style={{fontSize:9,background:'#f1f5f9',color:'#64748b',padding:'2px 5px',borderRadius:4,fontWeight:600}}>IWS</span>
                    </td>
                    {dayMeta.map(dm => {
                      const hrs = getIWSHours(worker.id,dm.dateStr)
                      const conflict = hasConflict(worker.id,dm.dateStr)
                      return (<td key={dm.day} style={{padding:'4px 2px',textAlign:'center',fontSize:10,borderRight:'1px solid #f9fafb',background:conflict?'#fef2f2':dm.isHoliday&&hrs>0?'#fee2e2':dm.isFriday&&hrs>0?'#fef3c7':hrs>8?'#fffbeb':'transparent',fontWeight:hrs>8?700:400,color:conflict?'#dc2626':hrs>8?'#d97706':hrs===0||hrs===null?'#cbd5e1':'#0f172a',cursor:conflict?'pointer':'default',outline:conflict?'2px solid #fca5a5':'none'}} onClick={() => {
                        if (conflict) { const cr = getConflictRecord(worker.id,dm.dateStr); if (cr) { setSelectedConflict({...cr,worker_name:worker.full_name,worker_number:worker.worker_number,dateStr:dm.dateStr,dayName:dm.dayName,iws_hours:hrs,isFriday:dm.isFriday,isHoliday:dm.isHoliday}); setConflictNote(''); setConflictResolution('use_iws'); setConflictCustomHours(''); setConflictDrawerOpen(true) }}
                      }}>{hrs===null||hrs===0?<span style={{color:'#e2e8f0'}}>—</span>:hrs}{conflict&&<span style={{fontSize:8}}> ⚠</span>}</td>)
                    })}
                    <td rowSpan={3} style={{textAlign:'right',padding:'8px 6px',fontWeight:700,fontSize:11,borderLeft:'2px solid #cbd5e1',verticalAlign:'middle'}}>{totalHrs||'—'}h</td>
                    <td rowSpan={3} style={{textAlign:'right',padding:'8px 6px',fontSize:11,color:'#64748b',verticalAlign:'middle'}}>{normalHrs||'—'}h</td>
                    <td rowSpan={3} style={{textAlign:'right',padding:'8px 6px',fontSize:11,color:ot1Hrs>0?'#d97706':'#cbd5e1',fontWeight:ot1Hrs>0?600:400,verticalAlign:'middle'}}>{ot1Hrs>0?`${ot1Hrs}h`:'—'}</td>
                    <td rowSpan={3} style={{textAlign:'right',padding:'8px 6px',fontSize:11,color:ot2Hrs>0?'#dc2626':'#cbd5e1',fontWeight:ot2Hrs>0?600:400,verticalAlign:'middle'}}>{ot2Hrs>0?`${ot2Hrs}h`:'—'}</td>
                    <td rowSpan={3} style={{textAlign:'right',padding:'8px 8px',fontSize:11,fontWeight:700,color:'#0d9488',verticalAlign:'middle'}}>{grossPay>0?`AED ${Math.round(grossPay).toLocaleString()}`:'—'}</td>
                  </tr>
                  {/* Client row */}
                  <tr style={{background:'#f0f9ff'}}>
                    <td style={{position:'sticky',left:260,zIndex:2,background:'#f0f9ff',padding:'4px 6px',textAlign:'center',borderRight:'2px solid #cbd5e1'}}>
                      <span style={{fontSize:9,background:'#bae6fd',color:'#0369a1',padding:'2px 5px',borderRadius:4,fontWeight:600}}>Client</span>
                    </td>
                    {dayMeta.map(dm => {
                      const clientHrs = getClientHours(worker.id,dm.dateStr)
                      return (<td key={dm.day} style={{padding:'4px 2px',textAlign:'center',fontSize:10,color:'#0369a1',borderRight:'1px solid #e0f2fe',background:'#f0f9ff'}}>{clientHrs!==null?clientHrs:<span style={{color:'#bae6fd',fontSize:9}}>—</span>}</td>)
                    })}
                  </tr>
                  {/* Conflict row */}
                  <tr style={{background:hasAnyConflict?'#fff5f5':'transparent'}}>
                    <td style={{position:'sticky',left:260,zIndex:2,background:hasAnyConflict?'#fff5f5':'transparent',padding:'4px 6px',textAlign:'center',borderRight:'2px solid #cbd5e1',borderBottom:'2px solid #f1f5f9'}}>
                      {hasAnyConflict&&<span style={{fontSize:9,background:'#fee2e2',color:'#dc2626',padding:'2px 5px',borderRadius:4,fontWeight:600}}>⚠ Gap</span>}
                    </td>
                    {dayMeta.map(dm => {
                      const conflict = hasConflict(worker.id,dm.dateStr)
                      const cr = conflict?getConflictRecord(worker.id,dm.dateStr):null
                      const diff = cr?((cr.client_hours||0)-(cr.iws_hours||getIWSHours(worker.id,dm.dateStr)||0)):0
                      return (<td key={dm.day} style={{padding:'4px 2px',textAlign:'center',fontSize:9,borderRight:'1px solid #fee2e2',borderBottom:'2px solid #f1f5f9',background:conflict?'#fef2f2':'transparent',cursor:conflict?'pointer':'default',fontWeight:conflict?700:400,color:'#dc2626'}} onClick={() => {
                        if (conflict&&cr) { setSelectedConflict({...cr,worker_name:worker.full_name,worker_number:worker.worker_number,dateStr:dm.dateStr,dayName:dm.dayName,iws_hours:getIWSHours(worker.id,dm.dateStr),isFriday:dm.isFriday,isHoliday:dm.isHoliday}); setConflictNote(''); setConflictResolution('use_iws'); setConflictCustomHours(''); setConflictDrawerOpen(true) }
                      }}>{conflict?(diff>0?`+${diff}h`:`${diff}h`):''}</td>)
                    })}
                  </tr>
                </React.Fragment>
              )
            })}
            {/* Totals */}
            <tr style={{background:'#0f172a',color:'white',position:'sticky',bottom:0}}>
              <td colSpan={2} style={{position:'sticky',left:0,zIndex:3,background:'#0f172a',padding:'10px 10px',fontWeight:700,fontSize:12,borderRight:'2px solid #1e293b'}}>TOTALS — {filteredWorkers.length} workers</td>
              <td style={{position:'sticky',left:260,zIndex:3,background:'#0f172a',borderRight:'2px solid #334155',padding:'10px 6px'}} />
              {dayMeta.map(dm => {
                const dayTotal = filteredWorkers.reduce((sum,w) => sum+(getIWSHours(w.id,dm.dateStr)||0),0)
                return <td key={dm.day} style={{padding:'6px 2px',textAlign:'center',fontSize:10,fontWeight:600,color:dayTotal>0?'#5eead4':'#334155',borderRight:'1px solid #1e293b'}}>{dayTotal>0?dayTotal:''}</td>
              })}
              {(() => {
                const gT=filteredWorkers.reduce((s,w)=>s+allLines.filter(l=>l.worker_id===w.id).reduce((a,l)=>a+(l.total_hours||0),0),0)
                const gN=filteredWorkers.reduce((s,w)=>s+allLines.filter(l=>l.worker_id===w.id).reduce((a,l)=>a+(l.normal_hours||0),0),0)
                const gO1=filteredWorkers.reduce((s,w)=>s+allLines.filter(l=>l.worker_id===w.id).reduce((a,l)=>a+(l.ot_hours||0),0),0)
                const gO2=filteredWorkers.reduce((s,w)=>s+allLines.filter(l=>l.worker_id===w.id).reduce((a,l)=>a+(l.holiday_hours||0),0),0)
                const gGross=filteredWorkers.reduce((s,w)=>{const ls=allLines.filter(l=>l.worker_id===w.id);const t=ls.reduce((a,l)=>a+(l.total_hours||0),0);const o1=ls.reduce((a,l)=>a+(l.ot_hours||0),0);const o2=ls.reduce((a,l)=>a+(l.holiday_hours||0),0);const f=w.category==='Contract Worker'||w.category==='Subcontract Worker';if(f)return s+t*(w.hourly_rate||0);const br=(w.monthly_salary||0)/30/8;return s+(w.monthly_salary||0)+o1*br*1.25+o2*br*1.50},0)
                return (<>
                  <td style={{textAlign:'right',padding:'10px 6px',fontWeight:700,color:'white',borderLeft:'2px solid #334155'}}>{gT}h</td>
                  <td style={{textAlign:'right',padding:'10px 6px',color:'#94a3b8'}}>{gN}h</td>
                  <td style={{textAlign:'right',padding:'10px 6px',color:'#fbbf24',fontWeight:gO1>0?700:400}}>{gO1>0?`${gO1}h`:'—'}</td>
                  <td style={{textAlign:'right',padding:'10px 6px',color:'#f87171',fontWeight:gO2>0?700:400}}>{gO2>0?`${gO2}h`:'—'}</td>
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
          {pendingConflicts > 0 ? (
            <div><div style={{fontSize:13,fontWeight:600,color:'#dc2626'}}>⚠ {pendingConflicts} conflict{pendingConflicts>1?'s':''} remaining</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Click the red cells above to resolve each conflict</div></div>
          ) : timesheetHeaders.length === 0 ? (
            <div style={{fontSize:13,color:'#94a3b8'}}>Upload a timesheet to begin</div>
          ) : (
            <div><div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ All clear — timesheet ready for confirmation</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{filteredWorkers.length} workers · {allLines.reduce((s,l)=>s+(l.total_hours||0),0)} total hours</div></div>
          )}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {step1Confirmed ? (<>
            <span style={{fontSize:13,fontWeight:600,color:'#16a34a',background:'#f0fdf4',padding:'8px 14px',borderRadius:6}}>✓ Step 1 Complete</span>
            <button className="btn btn-secondary" onClick={() => { setStep1Confirmed(false); setStepStatus(prev => ({...prev,1:'active',2:'locked'})) }}>← Edit Timesheet</button>
            <button className="btn btn-primary" onClick={() => setCurrentStep(2)}>Go to Step 2 →</button>
          </>) : (
            <button className="btn btn-primary" style={{padding:'10px 24px',fontSize:14,opacity:pendingConflicts>0||timesheetHeaders.length===0?0.4:1,cursor:pendingConflicts>0||timesheetHeaders.length===0?'not-allowed':'pointer'}} disabled={pendingConflicts>0||timesheetHeaders.length===0} onClick={() => {
              if (pendingConflicts>0) return
              setStep1Confirmed(true)
              setStepStatus(prev => ({...prev,1:'complete',2:'active'}))
              showSuccess('Step 1 confirmed — timesheet hours locked for payroll calculation')
              setCurrentStep(2)
            }}>✓ Confirm Timesheet & Proceed →</button>
          )}
        </div>
      </div>
    </div>)
  }

  const Step2PayrollCalculation = () => {
    const totals = calculatePayrollTotals()
    const pendingPenaltiesArr = penalties.filter(p => p.status==='pending_hr_confirmation')
    const unpaidPenaltiesCount = pendingPenaltiesArr.length
    return (<div>
      <InstructionBanner step={2} title="Payroll Calculation" roleLabel="HR Admin" description="Review the calculated earnings for every worker. All figures are calculated automatically from confirmed timesheet hours. Add any adjustments needed, confirm pending penalties, and check all totals before sending for Operations approval." howTo={['Review each worker row — click any row to see the full pay breakdown','Workers with ⚠ have pending penalties waiting for your confirmation','Use the + Add Adjustment button to add bonuses, deductions, or advance recovery','Carry-over notes from last month are shown at the top — address them now','Check the WPS / Non-WPS / Cash split totals are correct','When all penalties are confirmed and totals look right — click Confirm Calculation']} />

      {/* Carry-over notes */}
      {carryOverNotes.length > 0 && (<div style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontWeight:700,color:'#92400e',fontSize:14}}>📋 {carryOverNotes.length} carry-over note{carryOverNotes.length>1?'s':''} from previous period</div>
          <span style={{fontSize:12,color:'#b45309'}}>Address these before confirming payroll</span>
        </div>
        {carryOverNotes.map(note => (<div key={note.id} style={{background:'white',border:'1px solid #fde68a',borderRadius:8,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div><div style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{note.worker_name}</div><div style={{fontSize:12,color:'#64748b',marginTop:2}}>{note.note}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>From: {note.month} {note.year}</div></div>
          <button className="btn btn-secondary btn-sm" onClick={() => { resolveCarryOverNote(note.id, role); setCarryOverNotes(getPendingCarryOverNotes()); showSuccess('Carry-over note resolved') }}>✓ Resolved</button>
        </div>))}
      </div>)}

      {/* Summary strip */}
      <div className="summary-strip" style={{marginBottom:16}}>
        {[['Gross Payroll',`AED ${totals.totalGross.toLocaleString()}`,'teal'],['Total Deductions',`AED ${totals.totalDeductions.toLocaleString()}`,'danger'],['Net Payroll',`AED ${totals.totalNet.toLocaleString()}`,'success'],['Workers',totals.workerCount,'neutral']].map(([label,value,tone]) => (<div key={label} className="stat-card"><div className={`num ${tone}`} style={{fontSize:16}}>{value}</div><div className="lbl">{label}</div></div>))}
      </div>

      {/* Payment split */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
        {[['🏦 WPS — C3 Card',totals.wpsTotal,'#0d9488','#f0fdfa','Via Endered/C3 platform'],['💵 Non-WPS',totals.nonWpsTotal,'#d97706','#fffbeb','Direct bank transfer'],['⚠ Cash (Pending C3)',totals.cashTotal,'#dc2626','#fef2f2','C3 card not yet activated']].map(([label,amount,color,bg,sub]) => (<div key={label} style={{background:bg,border:`1.5px solid ${color}30`,borderRadius:10,padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:600,color,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
          <div style={{fontSize:20,fontWeight:700,color,marginBottom:4}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style={{fontSize:11,color:'#64748b'}}>{sub}</div>
        </div>))}
      </div>

      {/* Pending penalties */}
      {pendingPenaltiesArr.length > 0 && (<div style={{background:'#fff7ed',border:'1.5px solid #fed7aa',borderRadius:10,padding:'14px 20px',marginBottom:20}}>
        <div style={{fontWeight:700,color:'#c2410c',marginBottom:8}}>⚠ {pendingPenaltiesArr.length} penalt{pendingPenaltiesArr.length>1?'ies':'y'} awaiting your confirmation</div>
        <div style={{fontSize:12,color:'#9a3412',marginBottom:10}}>These penalties will NOT affect payroll until you confirm them.</div>
        {pendingPenaltiesArr.map(p => { const w = getWorker(p.worker_id); return (<div key={p.id} style={{background:'white',border:'1px solid #fed7aa',borderRadius:8,padding:'10px 14px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:13,fontWeight:600}}>{w?.full_name||'Unknown'} — {p.label}</div><div style={{fontSize:12,color:'#dc2626',fontWeight:600}}>AED {p.amount.toFixed(2)}</div></div>
          <div style={{display:'flex',gap:8}}><button className="btn btn-teal btn-sm" onClick={() => { confirmPenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()); showSuccess(`Penalty confirmed for ${w?.full_name}`) }}>✓ Confirm</button><button className="btn btn-ghost btn-sm" style={{color:'#dc2626'}} onClick={() => { removePenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()); showSuccess('Penalty removed') }}>✕ Remove</button></div>
        </div>) })}
      </div>)}

      {/* Worker table */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Worker payroll lines</h2><p>Click any worker row to see full breakdown</p></div><button className="btn btn-secondary btn-sm" onClick={() => setShowAdjPanel(!showAdjPanel)}>+ Add Adjustment</button></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Worker</th><th>Category</th><th>Payment</th><th style={{textAlign:'right'}}>Basic / Rate</th><th style={{textAlign:'right'}}>OT Pay</th><th style={{textAlign:'right'}}>Allowances</th><th style={{textAlign:'right'}}>Deductions</th><th style={{textAlign:'right'}}>Net Pay</th><th style={{textAlign:'center'}}>Flags</th></tr></thead>
          <tbody>
            {totals.calcs.map(calc => {
              const {worker} = calc; const isExpanded = expandedWorker===worker.id
              const hasPendingPenalty = penalties.some(p => p.worker_id===worker.id && p.status==='pending_hr_confirmation')
              return (<React.Fragment key={worker.id}>
                <tr style={{cursor:'pointer',borderLeft:`3px solid ${{'Permanent Staff':'#1e3a8a','Office Staff':'#6366f1','Contract Worker':'#f59e0b','Subcontract Worker':'#94a3b8'}[worker.category]||'#e2e8f0'}`,background:isExpanded?'#f0fdfa':'white'}} onClick={() => setExpandedWorker(isExpanded?null:worker.id)}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{worker.full_name}</div><div style={{fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{worker.worker_number}</div></td>
                  <td><span style={{fontSize:11,background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:4}}>{worker.category}</span></td>
                  <td><StatusBadge label={calc.paymentMethod||'WPS'} tone={calc.paymentMethod==='Non-WPS'?'warning':calc.paymentMethod==='Cash'?'danger':'success'} /></td>
                  <td style={{textAlign:'right',fontSize:12}}>{calc.isFlat?`AED ${worker.hourly_rate}/hr`:`AED ${(worker.monthly_salary||0).toLocaleString()}/mo`}</td>
                  <td style={{textAlign:'right',fontSize:12,color:calc.ot1Pay+calc.ot2Pay>0?'#d97706':'#cbd5e1'}}>{calc.ot1Pay+calc.ot2Pay>0?`AED ${(calc.ot1Pay+calc.ot2Pay).toLocaleString()}`:'—'}</td>
                  <td style={{textAlign:'right',fontSize:12,color:calc.allowances>0?'#16a34a':'#cbd5e1'}}>{calc.allowances>0?`AED ${calc.allowances.toLocaleString()}`:'—'}</td>
                  <td style={{textAlign:'right',fontSize:12,color:calc.totalDeductions>0?'#dc2626':'#cbd5e1',fontWeight:calc.totalDeductions>0?600:400}}>{calc.totalDeductions>0?`-AED ${calc.totalDeductions.toLocaleString()}`:'—'}</td>
                  <td style={{textAlign:'right',fontSize:13,fontWeight:700,color:'#0d9488'}}>AED {calc.netPay.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  <td style={{textAlign:'center'}}>{hasPendingPenalty?<span title="Pending penalty">⚠️</span>:calc.paymentMethod==='Cash'?<span title="Cash">🟠</span>:<span style={{color:'#16a34a'}}>✓</span>}</td>
                </tr>
                {isExpanded && (<tr><td colSpan={9} style={{padding:0,background:'#f0fdfa',borderBottom:'2px solid #0d9488'}}>
                  <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#0d9488',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Earnings Breakdown</div>
                      {calc.isFlat ? (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hourly Rate</span><span>AED {worker.hourly_rate}/hr</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hours Worked</span><span>{calc.totalHours}h</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Standard Pay</span><span>AED {(calc.totalHours*(worker.hourly_rate||0)).toLocaleString()}</span></div>
                        {calc.ot2Hours>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>Holiday Premium ({calc.ot2Hours}h × ×0.50)</span><span>AED {calc.ot2Pay.toLocaleString()}</span></div>}
                      </>) : (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Basic Salary</span><span style={{fontWeight:600}}>AED {(worker.monthly_salary||0).toLocaleString()}</span></div>
                        {calc.allowances>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#16a34a'}}><span>Allowances</span><span>AED {calc.allowances.toLocaleString()}</span></div>}
                        {calc.ot1Hours>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#d97706'}}><span>OT Weekday ({calc.ot1Hours}h × {calc.baseRate} × 1.25)</span><span>AED {calc.ot1Pay.toLocaleString()}</span></div>}
                        {calc.ot2Hours>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>OT Fri/Holiday ({calc.ot2Hours}h × {calc.baseRate} × 1.50)</span><span>AED {calc.ot2Pay.toLocaleString()}</span></div>}
                      </>)}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:8}}><span>Gross Earnings</span><span style={{color:'#0d9488'}}>AED {calc.grossPay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#dc2626',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Deductions</div>
                      {calc.workerPenalties.length===0&&calc.workerAdjs.filter(a=>a.adjustment_type!=='allowance').length===0?<div style={{fontSize:12,color:'#94a3b8',fontStyle:'italic'}}>No deductions this period</div>:(<>
                        {calc.workerPenalties.map(p => <div key={p.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>{p.label}</span><span>-AED {p.amount.toFixed(2)}</span></div>)}
                        {calc.workerAdjs.filter(a=>a.adjustment_type!=='allowance').map(a => <div key={a.id||a.label} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>{a.label}</span><span>-AED {a.amount.toFixed(2)}</span></div>)}
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:8,color:'#dc2626'}}><span>Total Deductions</span><span>-AED {calc.totalDeductions.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                      </>)}
                      {penalties.filter(p=>p.worker_id===worker.id&&p.status==='pending_hr_confirmation').map(p => <div key={p.id} style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:6,padding:'8px 10px',marginTop:8}}>
                        <div style={{fontSize:12,fontWeight:600,color:'#c2410c',marginBottom:4}}>⏳ Pending: {p.label} — AED {p.amount.toFixed(2)}</div>
                        <div style={{display:'flex',gap:8}}><button className="btn btn-teal btn-sm" onClick={e=>{e.stopPropagation();confirmPenaltyDeduction(p.id);setPenalties(getPenaltyDeductions());showSuccess('Penalty confirmed')}}>✓ Confirm</button><button className="btn btn-ghost btn-sm" style={{color:'#dc2626'}} onClick={e=>{e.stopPropagation();removePenaltyDeduction(p.id);setPenalties(getPenaltyDeductions());showSuccess('Penalty removed')}}>✕ Remove</button></div>
                      </div>)}
                      <div style={{background:'#0f172a',color:'white',borderRadius:8,padding:'12px 14px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,fontWeight:700}}>NET PAY</span><span style={{fontSize:16,fontWeight:800,color:'#5eead4'}}>AED {calc.netPay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
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
          <button className="btn btn-teal" disabled={!adjForm.worker_id||!adjForm.label||!adjForm.amount} onClick={() => { addPayrollAdjustment({batch_id:selectedBatch?.id,worker_id:adjForm.worker_id,adjustment_type:adjForm.type,label:adjForm.label,amount:parseFloat(adjForm.amount)}); setPayrollAdjustments(getPayrollAdjustments(selectedBatch?.id,null)); setAdjForm({worker_id:'',type:'deduction',label:'',amount:''}); showSuccess('Adjustment added') }}>Add</button>
        </div>
      </div>)}

      {/* Bottom action bar */}
      <div style={{position:'sticky',bottom:0,background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 -4px 16px rgba(0,0,0,0.06)',marginTop:16}}>
        <div>
          {unpaidPenaltiesCount>0?<div><div style={{fontSize:13,fontWeight:600,color:'#c2410c'}}>⚠ {unpaidPenaltiesCount} penalt{unpaidPenaltiesCount>1?'ies':'y'} awaiting confirmation</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Confirm or remove all penalties before proceeding</div></div>
          :carryOverNotes.length>0?<div><div style={{fontSize:13,fontWeight:600,color:'#b45309'}}>📋 {carryOverNotes.length} carry-over note{carryOverNotes.length>1?'s':''} unresolved</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>You can still proceed — address carry-over notes when possible</div></div>
          :<div><div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ Calculation ready — totals confirmed</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Gross: AED {totals.totalGross.toLocaleString()} · Net: AED {totals.totalNet.toLocaleString()}</div></div>}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className="btn btn-secondary" onClick={() => {setCurrentStep(1);setStep2Confirmed(false)}}>← Back to Step 1</button>
          {step2Confirmed?(<><span style={{fontSize:13,fontWeight:600,color:'#16a34a',background:'#f0fdf4',padding:'8px 14px',borderRadius:6}}>✓ Step 2 Complete</span><button className="btn btn-secondary" onClick={() => {setStep2Confirmed(false);setStepStatus(prev=>({...prev,2:'active',3:'locked'}))}}>← Edit Calculation</button><button className="btn btn-primary" onClick={() => setCurrentStep(3)}>Go to Step 3 →</button></>)
          :(<button className="btn btn-primary" style={{padding:'10px 24px',fontSize:14,opacity:unpaidPenaltiesCount>0?0.4:1,cursor:unpaidPenaltiesCount>0?'not-allowed':'pointer'}} disabled={unpaidPenaltiesCount>0} onClick={() => { if(unpaidPenaltiesCount>0) return; setStep2Confirmed(true); setStepStatus(prev=>({...prev,2:'complete',3:'active'})); if(selectedBatch) updatePayrollBatch({...selectedBatch,step2_confirmed:true,step2_confirmed_at:new Date().toISOString(),step2_confirmed_by:role}); showSuccess('Payroll calculation confirmed — sent for Operations approval'); setCurrentStep(3) }}>✓ Confirm & Send for Operations Approval →</button>)}
        </div>
      </div>
    </div>)
  }

  const Step3OperationsApproval = () => {
    const canApproveOps = role === 'operations' || role === 'owner'
    const filteredW = workers.filter(w => w.category !== 'Office Staff' && w.active !== false)
    const flaggedCount = Object.keys(flaggedWorkers).length

    // Build day meta for condensed grid
    const parts = (selectedBatch?.month_label||'April 2026').split(' ')
    const monthIndex = MONTH_NAMES.indexOf(parts[0])
    const yearNum = parseInt(parts[1])||2026
    const daysInMonth = new Date(yearNum, monthIndex+1, 0).getDate()
    const dayMeta = Array.from({length:daysInMonth},(_,i) => {
      const day=i+1; const dateStr=`${yearNum}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const dateObj=new Date(yearNum,monthIndex,day); const dow=dateObj.getDay()
      return {day,dateStr,isFriday:dow===5,isHoliday:isPublicHoliday(dateStr)}
    })
    const getIWSHours = (wId,dateStr) => { const l=allLines.find(l=>l.worker_id===wId&&l.work_date===dateStr); return l?(l.total_hours||0):null }

    return (<div>
      <InstructionBanner step={3} title="Operations Approval" roleLabel="Operations" description="Review the payroll hours and confirm they match what actually happened on site. You are not reviewing pay rates — just confirming the hours worked are correct." howTo={['Review the worker hours summary table below','Check each worker\'s total hours match your site records','Click Flag next to any worker if their hours are incorrect','If everything is correct: click Approve Hours','If something needs fixing: click Reject and explain what HR needs to correct']} />

      {/* Rejection workflow banner */}
      {opsRejected && (<div style={{background:'#fff7ed',border:'2px solid #fb923c',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
        <div style={{fontWeight:700,color:'#c2410c',fontSize:14,marginBottom:8}}>⚠ Operations rejected this payroll</div>
        <div style={{fontSize:13,color:'#7c2d12',marginBottom:12,background:'#fef2f2',borderRadius:6,padding:'10px 14px',border:'1px solid #fca5a5'}}><strong>Rejection reason:</strong> {opsRejectionNote}</div>
        {(role==='hr_admin'||role==='owner')?(showHrReplyPanel?(<div>
          <div style={{fontSize:12,fontWeight:600,color:'#0f172a',marginBottom:6}}>Your reply to Operations:</div>
          <textarea className="form-textarea" rows={3} placeholder="Explain what you have corrected..." value={hrReplyToOps} onChange={e=>setHrReplyToOps(e.target.value)} />
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button className="btn btn-primary" disabled={!hrReplyToOps.trim()} onClick={() => { setOpsRejected(false);setOpsRejectionNote('');setShowHrReplyPanel(false); if(selectedBatch) updatePayrollBatch({...selectedBatch,ops_rejected:false,hr_reply_to_ops:hrReplyToOps}); showSuccess('Payroll resubmitted for Operations approval') }}>↩ Resubmit</button>
            <button className="btn btn-secondary" onClick={() => setShowHrReplyPanel(false)}>Cancel</button>
          </div>
        </div>):(<button className="btn btn-secondary" onClick={() => setShowHrReplyPanel(true)}>📝 Reply to Operations & Resubmit</button>))
        :(<div style={{fontSize:12,color:'#94a3b8'}}>Waiting for HR Admin to address the rejection and resubmit.</div>)}
      </div>)}

      {!canApproveOps&&!opsRejected&&<div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#0369a1'}}>ℹ Waiting for Operations to review and approve. This page is read-only for {role} role.</div>}

      {/* Condensed hours table */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Timesheet Hours Summary — {selectedBatch?.month_label}</h2><p>Operations: verify these hours match site records</p></div></div>
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
                const total = wLines.reduce((s,l)=>s+(l.total_hours||0),0)
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
                      {!canApproveOps&&isFlagged&&<span style={{fontSize:10,color:'#dc2626'}}>⚠</span>}
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

      {/* Approval section */}
      {canApproveOps&&!opsRejected&&!step3Approved&&(<div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'20px 24px',marginTop:20}}>
        <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16}}>Operations Decision</div>
        {flaggedCount>0&&<div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#dc2626',fontWeight:600}}>⚠ {flaggedCount} worker{flaggedCount>1?'s':''} flagged — resolve flags before approving, or reject with explanation</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <button className="btn btn-secondary" style={{padding:14,fontSize:14,border:'2px solid #dc2626',color:'#dc2626'}} onClick={() => setShowOpsRejectModal(true)}>✕ Reject — Send back to HR</button>
          <button className="btn btn-primary" style={{padding:14,fontSize:14,background:'linear-gradient(135deg,#0d9488,#0891b2)',opacity:flaggedCount>0?0.5:1,cursor:flaggedCount>0?'not-allowed':'pointer'}} disabled={flaggedCount>0} onClick={() => { if(flaggedCount>0) return; if(!window.confirm(`Confirm: You have reviewed all hours for ${selectedBatch?.month_label} and they are correct?`)) return; setStep3Approved(true);setStepStatus(prev=>({...prev,3:'complete',4:'active'})); if(selectedBatch) updatePayrollBatch({...selectedBatch,ops_approval_status:'approved',ops_approved_by:role==='owner'?'Management':'Operations',ops_approved_at:new Date().toISOString()}); showSuccess('Hours approved by Operations — sent for Management approval');setCurrentStep(4) }}>✓ Approve Hours — Send for Management Approval</button>
        </div>
        <div style={{fontSize:11,color:'#94a3b8',marginTop:12,textAlign:'center'}}>By approving, you confirm that the hours recorded match site operations.</div>
      </div>)}

      {/* Bottom bar */}
      <div style={{position:'sticky',bottom:0,background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 -4px 16px rgba(0,0,0,0.06)',marginTop:16}}>
        <div>{opsRejected?<div style={{fontSize:13,fontWeight:600,color:'#c2410c'}}>⚠ Rejected by Operations — HR must address and resubmit</div>:step3Approved?<div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ Operations approved — awaiting Management</div>:<div style={{fontSize:13,color:'#64748b'}}>Waiting for Operations to review and approve hours</div>}</div>
        <div style={{display:'flex',gap:8}}><button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>← Back to Step 2</button>{step3Approved&&<button className="btn btn-primary" onClick={() => setCurrentStep(4)}>Go to Step 4 →</button>}</div>
      </div>
    </div>)
  }

  const Step4OwnerApproval = () => {
    const canApprove = role === 'owner' || role === 'accounts'
    const totals = calculatePayrollTotals()
    const allChecked = approvalChecklist.conflicts && approvalChecklist.penalties && approvalChecklist.opsApproved && approvalChecklist.carryOver && approvalChecklist.wpsReviewed
    const onHoldCount = totals.calcs.filter(c => c.paymentMethod === 'Cash').length

    return (<div>
      <InstructionBanner step={4} title="Management Approval" roleLabel="Management / Accounts"
        description="This is the final review before payroll is executed. Review all totals, confirm the pre-approval checklist, and sign off. Once approved the batch will be locked and payslips generated."
        howTo={['Review the payroll summary cards and WPS split','Expand any worker row to inspect their full breakdown','Complete all 5 checklist items (they auto-check where possible)','Click the Approve & Run Payroll button to lock the batch','You will be asked to confirm in a modal before execution']} />

      {!canApprove && <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#0369a1'}}>ℹ Only Management or Accounts role can approve payroll. Current role: {role}</div>}

      {step4Approved && <div style={{background:'#f0fdf4',border:'2px solid #86efac',borderRadius:10,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:24}}>✓</span>
        <div><div style={{fontWeight:700,color:'#16a34a',fontSize:15}}>Payroll Approved & Locked</div><div style={{fontSize:12,color:'#15803d'}}>This batch has been signed off. Proceed to Step 5 to generate files.</div></div>
      </div>}

      {/* Summary cards */}
      <div className="summary-strip" style={{marginBottom:16}}>
        {[['Gross Payroll',`AED ${totals.totalGross.toLocaleString(undefined,{minimumFractionDigits:2})}`,'teal'],['Total Deductions',`AED ${totals.totalDeductions.toLocaleString(undefined,{minimumFractionDigits:2})}`,'danger'],['Net Payroll',`AED ${totals.totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}`,'success'],['On Hold',`${onHoldCount} worker${onHoldCount!==1?'s':''}`,'warning']].map(([label,value,tone]) => (<div key={label} className="stat-card"><div className={`num ${tone}`} style={{fontSize:16}}>{value}</div><div className="lbl">{label}</div></div>))}
      </div>

      {/* WPS split */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
        {[['🏦 WPS — C3 Card',totals.wpsTotal,'#0d9488','#f0fdfa'],['💵 Non-WPS',totals.nonWpsTotal,'#d97706','#fffbeb'],['⚠ Cash',totals.cashTotal,'#dc2626','#fef2f2']].map(([label,amount,color,bg]) => (<div key={label} style={{background:bg,border:`1.5px solid ${color}30`,borderRadius:10,padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:600,color,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
          <div style={{fontSize:20,fontWeight:700,color}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>))}
      </div>

      {/* Worker table */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Final Payroll Review</h2><p>Click any row to inspect full breakdown</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Worker</th><th>Category</th><th>Payment</th><th style={{textAlign:'right'}}>Gross</th><th style={{textAlign:'right'}}>Deductions</th><th style={{textAlign:'right'}}>Net Pay</th></tr></thead>
          <tbody>
            {totals.calcs.map(calc => {
              const {worker} = calc; const isExp = expandedWorker===('owner_'+worker.id)
              return (<React.Fragment key={worker.id}>
                <tr style={{cursor:'pointer',background:isExp?'#f0fdfa':'white'}} onClick={() => setExpandedWorker(isExp?null:'owner_'+worker.id)}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{worker.full_name}</div><div style={{fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{worker.worker_number}</div></td>
                  <td><span style={{fontSize:11,background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:4}}>{worker.category}</span></td>
                  <td><StatusBadge label={calc.paymentMethod||'WPS'} tone={calc.paymentMethod==='Cash'?'danger':'success'} /></td>
                  <td style={{textAlign:'right',fontSize:12}}>AED {calc.grossPay.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td style={{textAlign:'right',fontSize:12,color:calc.totalDeductions>0?'#dc2626':'#cbd5e1'}}>{calc.totalDeductions>0?`-AED ${calc.totalDeductions.toLocaleString(undefined,{minimumFractionDigits:2})}`:'—'}</td>
                  <td style={{textAlign:'right',fontSize:13,fontWeight:700,color:'#0d9488'}}>AED {calc.netPay.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>
                {isExp && (<tr><td colSpan={6} style={{padding:0,background:'#f0fdfa',borderBottom:'2px solid #0d9488'}}>
                  <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#0d9488',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Earnings</div>
                      {calc.isFlat ? (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hourly Rate</span><span>AED {worker.hourly_rate}/hr</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hours Worked</span><span>{calc.totalHours}h</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Standard Pay</span><span>AED {calc.basicPay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                        {calc.ot2Hours>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>Holiday Premium ({calc.ot2Hours}h)</span><span>AED {calc.ot2Pay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                      </>) : (<>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Basic Salary</span><span style={{fontWeight:600}}>AED {(worker.monthly_salary||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                        {calc.allowances>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#16a34a'}}><span>Allowances</span><span>AED {calc.allowances.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                        {calc.ot1Hours>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#d97706'}}><span>OT Weekday ({calc.ot1Hours}h)</span><span>AED {calc.ot1Pay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                        {calc.ot2Hours>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>OT Fri/Holiday ({calc.ot2Hours}h)</span><span>AED {calc.ot2Pay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                      </>)}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:8}}><span>Gross</span><span style={{color:'#0d9488'}}>AED {calc.grossPay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#dc2626',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Deductions</div>
                      {calc.workerPenalties.length===0&&calc.workerAdjs.filter(a=>a.adjustment_type!=='allowance').length===0?<div style={{fontSize:12,color:'#94a3b8',fontStyle:'italic'}}>No deductions</div>:(<>
                        {calc.workerPenalties.map(p => <div key={p.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>{p.label}</span><span>-AED {p.amount.toFixed(2)}</span></div>)}
                        {calc.workerAdjs.filter(a=>a.adjustment_type!=='allowance').map(a => <div key={a.id||a.label} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'#dc2626'}}><span>{a.label}</span><span>-AED {a.amount.toFixed(2)}</span></div>)}
                      </>)}
                      <div style={{background:'#0f172a',color:'white',borderRadius:8,padding:'12px 14px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,fontWeight:700}}>NET PAY</span><span style={{fontSize:16,fontWeight:800,color:'#5eead4'}}>AED {calc.netPay.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                    </div>
                  </div>
                </td></tr>)}
              </React.Fragment>)
            })}
          </tbody>
        </table></div>
      </div>

      {/* Pre-approval checklist */}
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
          <button className="btn btn-primary" style={{width:'100%',padding:'14px',fontSize:15,background:allChecked?'linear-gradient(135deg,#0d9488,#0891b2)':'#cbd5e1',cursor:allChecked?'pointer':'not-allowed',border:'none',borderRadius:10,fontWeight:700,color:'white'}} disabled={!allChecked} onClick={() => setShowApprovalModal(true)}>✅ APPROVE & RUN PAYROLL</button>
          {!allChecked && <div style={{textAlign:'center',fontSize:11,color:'#94a3b8',marginTop:8}}>Complete all checklist items to enable approval</div>}
        </div>
      </div>)}

      {/* Bottom bar */}
      <div style={{position:'sticky',bottom:0,background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 -4px 16px rgba(0,0,0,0.06)',marginTop:16}}>
        <div>{step4Approved?<div style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>✓ Payroll approved and locked by Management</div>:<div style={{fontSize:13,color:'#64748b'}}>Awaiting Management approval</div>}</div>
        <div style={{display:'flex',gap:8}}><button className="btn btn-secondary" onClick={() => setCurrentStep(3)}>← Back to Step 3</button>{step4Approved&&<button className="btn btn-primary" onClick={() => setCurrentStep(5)}>Go to Step 5 →</button>}</div>
      </div>
    </div>)
  }

  const Step5RunAndDistribute = () => {
    const totals = calculatePayrollTotals()
    const batchLabel = selectedBatch?.month_label||'April 2026'

    return (<div>
      <InstructionBanner step={5} title="Run & Distribute" roleLabel="HR Admin / Management"
        description="Payroll has been approved. Download the WPS file, generate payslips, and distribute to workers."
        howTo={['Download the WPS Excel file for Endered/C3 upload','Download all payslips as a ZIP archive','Print or download individual payslips from the table below','The batch is now locked — no further edits are possible']} />

      {/* Success banner */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',borderRadius:12,padding:'24px 28px',marginBottom:24,display:'flex',alignItems:'center',gap:16}}>
        <div style={{width:48,height:48,borderRadius:'50%',background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔒</div>
        <div>
          <div style={{color:'white',fontSize:18,fontWeight:700,marginBottom:4}}>Payroll Approved & Locked</div>
          <div style={{color:'#94a3b8',fontSize:13}}>{batchLabel} · {totals.workerCount} workers · Net: AED {totals.totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
        </div>
      </div>

      {/* Download cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:24}}>
        <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>📊</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>WPS Excel</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>For Endered/C3 platform upload</div>
          <button className="btn btn-primary btn-sm" onClick={generateWPSExcel}>Download .xlsx</button>
        </div>
        <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>📄</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>Payslips ZIP</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>{totals.calcs.length} individual HTML payslips</div>
          <button className="btn btn-teal btn-sm" disabled={generating} onClick={generatePayslipsZip}>{generating?'Generating...':'Download .zip'}</button>
        </div>
        <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>🖨</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>Summary Print</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>Full payroll summary report</div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {/* Individual payslips table */}
      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-header"><div><h2>Individual Payslips</h2><p>Preview, print, or download each worker payslip</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Worker</th><th>Category</th><th>Payment</th><th style={{textAlign:'right'}}>Net Pay</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
          <tbody>
            {totals.calcs.map(calc => {
              const {worker} = calc
              return (<tr key={worker.id}>
                <td><div style={{fontWeight:600,fontSize:13}}>{worker.full_name}</div><div style={{fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{worker.worker_number}</div></td>
                <td><span style={{fontSize:11,background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:4}}>{worker.category}</span></td>
                <td><StatusBadge label={calc.paymentMethod||'WPS'} tone={calc.paymentMethod==='Cash'?'danger':'success'} /></td>
                <td style={{textAlign:'right',fontSize:13,fontWeight:700,color:'#0d9488'}}>AED {calc.netPay.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                <td style={{textAlign:'center'}}>
                  <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                    <button className="btn btn-secondary btn-sm" style={{fontSize:10}} onClick={() => { const html = generatePayslipHTML(worker,calc,batchLabel); const w = window.open('','_blank','width=600,height=800'); w.document.write(html); w.document.close(); w.print() }}>🖨 Print</button>
                    <button className="btn btn-secondary btn-sm" style={{fontSize:10}} onClick={() => { const html = generatePayslipHTML(worker,calc,batchLabel); const blob = new Blob([html],{type:'text/html'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`Payslip_${worker.worker_number}_${batchLabel.replace(' ','_')}.html`; a.click(); URL.revokeObjectURL(url) }}>⬇ Download</button>
                  </div>
                </td>
              </tr>)
            })}
          </tbody>
        </table></div>
      </div>

      {/* Lock badge */}
      <div style={{textAlign:'center',padding:'20px 0'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'#f1f5f9',borderRadius:20,padding:'8px 20px',fontSize:12,color:'#64748b'}}>
          <span>🔒</span> Batch locked · {selectedBatch?.owner_approved_at ? new Date(selectedBatch.owner_approved_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : new Date().toLocaleDateString('en-GB')}
        </div>
      </div>
    </div>)
  }

  return (<>
    <AppShell pageTitle="Payroll Run">
      <div style={{display:'flex',gap:0,minHeight:'calc(100vh - 60px)',margin:'-24px'}}>
        {/* Sidebar */}
        <div style={{width:260,minWidth:260,background:'white',borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',overflowY:'auto',zIndex:10}}>
          <div style={{background:'#0f172a',padding:16}}>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Payroll Period</div>
            <select className="form-select" style={{background:'#1e293b',color:'white',border:'1px solid #334155',fontSize:13}} value={selectedBatch?.month||''} onChange={e => handleBatchChange(e.target.value)}>
              {allBatches.map(b => <option key={b.id} value={b.month}>{b.month_label}{b.locked?' 🔒':''}</option>)}
            </select>
            {selectedBatch?.locked&&<div style={{fontSize:11,color:'#f87171',marginTop:6}}>🔒 This payroll is locked</div>}
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
          {/* Progress */}
          <div style={{padding:'12px 16px',borderTop:'1px solid #f1f5f9'}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>Progress: {completedCount}/5 steps complete</div>
            <div style={{height:6,background:'#f1f5f9',borderRadius:3}}><div style={{height:'100%',width:`${(completedCount/5)*100}%`,background:'linear-gradient(90deg,#0d9488,#0891b2)',borderRadius:3,transition:'width 0.3s ease'}} /></div>
          </div>
          {/* Quick stats */}
          <div style={{padding:'12px 16px',background:'#f8fafc',marginTop:'auto'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:600,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Quick Stats</div>
            {[['Site Workers',workers.filter(w=>w.category!=='Office Staff').length,'neutral'],['Total Lines',payrollLines.length,'neutral'],['Conflicts',pendingConflicts,pendingConflicts>0?'danger':'success'],['Timesheet Headers',timesheetHeaders.length,'neutral']].map(([label,value,tone]) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontSize:12,color:'#64748b'}}>{label}</span>
                <span style={{fontSize:12,fontWeight:600,color:tone==='danger'?'#dc2626':tone==='success'?'#16a34a':'#0f172a'}}>{value}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:11,color:'#94a3b8'}}>Office</span>
              <span style={{fontSize:11,color:'#94a3b8'}}>{workers.filter(w=>w.category==='Office Staff').length}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,padding:24,overflowY:'auto',background:'#f8fafc',minWidth:0}}>
          {successMsg&&<div style={{background:'#dcfce7',border:'1px solid #86efac',borderRadius:8,padding:'12px 16px',marginBottom:16,fontWeight:500,color:'#16a34a',fontSize:13}}>✓ {successMsg}</div>}
          {currentStep===1&&<Step1TimesheetReview />}
          {currentStep===2&&<Step2PayrollCalculation />}
          {currentStep===3&&<Step3OperationsApproval />}
          {currentStep===4&&<Step4OwnerApproval />}
          {currentStep===5&&<Step5RunAndDistribute />}
        </div>
      </div>
    </AppShell>

    {/* Conflict drawer backdrop */}
    {conflictDrawerOpen&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:199}} onClick={() => {setConflictDrawerOpen(false);setSelectedConflict(null)}} />}

    {/* Conflict drawer */}
    {conflictDrawerOpen&&selectedConflict&&(
      <div style={{position:'fixed',right:0,top:0,height:'100vh',width:500,background:'white',boxShadow:'-4px 0 32px rgba(0,0,0,0.15)',zIndex:200,display:'flex',flexDirection:'column',overflowY:'auto'}}>
        <div style={{background:'#0f172a',padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
          <div>
            <div style={{color:'#94a3b8',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Hour Conflict — Resolve Required</div>
            <div style={{color:'white',fontSize:17,fontWeight:700}}>{selectedConflict.worker_name}</div>
            <div style={{color:'#5eead4',fontSize:12,fontFamily:'monospace',marginTop:2}}>{selectedConflict.worker_number}</div>
            <div style={{color:'#94a3b8',fontSize:12,marginTop:4}}>
              {selectedConflict.dayName} · {new Date(selectedConflict.dateStr).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
              {selectedConflict.isFriday&&<span style={{marginLeft:8,background:'#fef3c7',color:'#d97706',padding:'1px 6px',borderRadius:4,fontSize:10,fontWeight:600}}>Friday — OT ×1.50</span>}
              {selectedConflict.isHoliday&&<span style={{marginLeft:8,background:'#fee2e2',color:'#dc2626',padding:'1px 6px',borderRadius:4,fontSize:10,fontWeight:600}}>Public Holiday</span>}
            </div>
          </div>
          <button onClick={() => {setConflictDrawerOpen(false);setSelectedConflict(null)}} style={{background:'none',border:'none',color:'#94a3b8',fontSize:22,cursor:'pointer',padding:'0 0 0 8px'}}>×</button>
        </div>
        <div style={{padding:'20px 24px',flexShrink:0}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:8,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#16a34a',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>IWS Recorded</div>
              <div style={{fontSize:28,fontWeight:700,color:'#15803d'}}>{selectedConflict.iws_hours||0}h</div>
              <div style={{fontSize:11,color:'#4ade80',marginTop:4}}>From our timesheet</div>
            </div>
            <div style={{background:'#eff6ff',border:'1.5px solid #93c5fd',borderRadius:8,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#1d4ed8',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Client Reported</div>
              <div style={{fontSize:28,fontWeight:700,color:'#1e40af'}}>{selectedConflict.client_hours||'?'}h</div>
              <div style={{fontSize:11,color:'#93c5fd',marginTop:4}}>From client Excel</div>
            </div>
          </div>
          <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 16px',textAlign:'center',marginBottom:16}}>
            <span style={{fontSize:13,fontWeight:600,color:'#dc2626'}}>Difference: {Math.abs((selectedConflict.client_hours||0)-(selectedConflict.iws_hours||0))}h {(selectedConflict.client_hours||0)>(selectedConflict.iws_hours||0)?'(client has MORE hours)':'(IWS has MORE hours)'}</span>
          </div>

          {/* Resolution options */}
          <div style={{fontSize:13,fontWeight:600,color:'#0f172a',marginBottom:10}}>How would you like to resolve this?</div>
          {[
            {value:'use_iws',label:`Use IWS hours — ${selectedConflict.iws_hours||0}h`,sub:'Keep our timesheet record.',color:'#16a34a',bg:'#f0fdf4',border:'#86efac'},
            {value:'use_client',label:`Use client hours — ${selectedConflict.client_hours||0}h`,sub:"Accept the client's record.",color:'#1d4ed8',bg:'#eff6ff',border:'#93c5fd'},
            {value:'average',label:`Split difference — ${(((selectedConflict.iws_hours||0)+(selectedConflict.client_hours||0))/2).toFixed(1)}h`,sub:'Use the average of both.',color:'#d97706',bg:'#fffbeb',border:'#fde68a'},
            {value:'custom',label:'Enter custom hours',sub:'Manually specify the correct hours.',color:'#7c3aed',bg:'#faf5ff',border:'#d8b4fe'}
          ].map(opt => (
            <div key={opt.value} onClick={() => setConflictResolution(opt.value)} style={{border:conflictResolution===opt.value?`2px solid ${opt.border}`:'2px solid #e2e8f0',borderRadius:8,padding:'10px 14px',marginBottom:8,cursor:'pointer',background:conflictResolution===opt.value?opt.bg:'white',transition:'all 0.15s ease'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${conflictResolution===opt.value?opt.color:'#cbd5e1'}`,background:conflictResolution===opt.value?opt.color:'white',flexShrink:0}} />
                <div><div style={{fontSize:13,fontWeight:600,color:conflictResolution===opt.value?opt.color:'#0f172a'}}>{opt.label}</div><div style={{fontSize:11,color:'#64748b'}}>{opt.sub}</div></div>
              </div>
            </div>
          ))}
          {conflictResolution==='custom'&&<div style={{marginTop:8}}><input className="form-input" type="number" min={0} max={24} step={0.5} placeholder="Enter hours (e.g. 8.5)" value={conflictCustomHours} onChange={e => setConflictCustomHours(e.target.value)} style={{fontSize:13}} /></div>}

          <div style={{marginTop:16,marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:600,color:'#0f172a',display:'block',marginBottom:6}}>Resolution notes * <span style={{fontSize:11,color:'#64748b',fontWeight:400,marginLeft:4}}>(required — explain why)</span></label>
            <textarea className="form-textarea" rows={3} placeholder="e.g. Confirmed with site supervisor — worker left 1 hour early due to medical appointment." value={conflictNote} onChange={e => setConflictNote(e.target.value)} style={{fontSize:12,resize:'vertical'}} />
          </div>

          <button className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:14}} disabled={!conflictNote.trim()||conflictSaving||(conflictResolution==='custom'&&!conflictCustomHours)} onClick={() => {
            setConflictSaving(true)
            resolveDiscrepancy(selectedConflict.id,role==='owner'?'Management':'HR Admin',conflictNote,conflictResolution==='use_client')
            refreshConflicts()
            showSuccess(`Conflict resolved for ${selectedConflict.worker_name}`)
            setConflictDrawerOpen(false); setSelectedConflict(null); setConflictSaving(false)
          }}>{conflictSaving?'Saving...':'✓ Save Resolution'}</button>
        </div>
      </div>
    )}

    {showOpsRejectModal && (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:12,padding:28,width:'min(480px,90vw)',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Reject Payroll — Send back to HR</h3>
        <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Explain clearly what needs to be corrected.</p>
        <label className="form-label">Reason for rejection *</label>
        <textarea className="form-textarea" rows={4} placeholder="e.g. Worker Ahmed shows 16 hours on Day 5 — he was only on site for 8 hours." value={opsRejectDraft} onChange={e => setOpsRejectDraft(e.target.value)} />
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-secondary" onClick={() => {setShowOpsRejectModal(false);setOpsRejectDraft('')}}>Cancel</button>
          <button className="btn btn-danger" disabled={!opsRejectDraft.trim()} onClick={() => { setOpsRejected(true);setOpsRejectionNote(opsRejectDraft);setShowOpsRejectModal(false);setStep3Approved(false);setStepStatus(prev=>({...prev,3:'error',4:'locked'})); if(selectedBatch) updatePayrollBatch({...selectedBatch,ops_rejected:true,ops_rejection_note:opsRejectDraft}); setCurrentStep(2);showSuccess('Payroll rejected — HR notified');setOpsRejectDraft('') }}>✕ Confirm Rejection</button>
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
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#64748b'}}>Workers</span><span style={{fontWeight:600}}>{calculatePayrollTotals().workerCount}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#64748b'}}>Net Payroll</span><span style={{fontWeight:700,color:'#0d9488'}}>AED {calculatePayrollTotals().totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-secondary" onClick={() => setShowApprovalModal(false)}>Cancel</button>
          <button className="btn btn-primary" style={{padding:'10px 24px',background:'linear-gradient(135deg,#0d9488,#0891b2)'}} onClick={() => {
            setStep4Approved(true); setPayrollExecuted(true); setShowApprovalModal(false)
            setStepStatus(prev=>({...prev,4:'complete',5:'active'}))
            if (selectedBatch) {
              lockPayrollBatch(selectedBatch.id)
              approvePayrollBatchOwner(selectedBatch.id, role)
              updatePayrollBatch({...selectedBatch, locked:true, owner_approval_status:'approved', owner_approved_by:role, owner_approved_at:new Date().toISOString()})
            }
            showSuccess('Payroll approved and locked — proceed to generate files')
            setCurrentStep(5)
          }}>✅ Approve & Lock Payroll</button>
        </div>
      </div>
    </div>)}
  </>)
}

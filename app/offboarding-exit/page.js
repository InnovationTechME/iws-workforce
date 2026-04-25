'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import LetterViewer from '../../components/LetterViewer'
import WorkerAvatar from '../../components/WorkerAvatar'
import {
  canCloseOffboardingRecord,
  closeWorkerFile,
  getOffboardingRecords,
  OFFBOARDING_ITEMS,
  startOffboarding,
  updateOffboarding,
} from '../../lib/offboardingService'
import { getPayrollByWorker } from '../../lib/payrollService'
import { upsertDocument } from '../../lib/documentService'
import { uploadWorkerDocument } from '../../lib/storageService'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDate } from '../../lib/utils'

const EXIT_DOC_OPTIONS = [
  { value: 'resignation_letter', label: 'Resignation Letter' },
  { value: 'termination_notice', label: 'Termination Notice' },
  { value: 'eos_calculation', label: 'EOS / Settlement Calculation' },
  { value: 'exit_clearance', label: 'Exit Clearance' },
  { value: 'final_payslip', label: 'Final Payslip' },
]

const MAX_EXIT_FILE_SIZE = 10 * 1024 * 1024
const EXIT_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const TRACK_LABELS = {
  direct_staff: 'IT Direct Staff',
  contract_worker: 'Contract Worker',
  subcontractor_company_worker: 'Supplier Company Worker',
}

const STEP_DEFINITIONS = [
  { key: 'initiated', label: 'Initiated' },
  { key: 'documents', label: 'Exit documents' },
  { key: 'settlement', label: 'Payroll settlement' },
  { key: 'clearance', label: 'Clearance' },
  { key: 'closure', label: 'File closure' },
]

function defaultExitDocType(reason) {
  return reason === 'Resignation' ? 'resignation_letter' : 'termination_notice'
}

function refFor(prefix, workerNumber) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `IT-${prefix}-${workerNumber || 'WORKER'}-${day}`
}

function validateExitFile(file) {
  if (!file) return null
  if (!EXIT_FILE_TYPES.includes(file.type)) return 'Use PDF, JPG, or PNG only.'
  if (file.size > MAX_EXIT_FILE_SIZE) return 'File must be 10 MB or smaller.'
  return null
}

function calculateServiceGratuity(worker, lastWorkingDate) {
  const salary = Number(worker?.monthly_salary || 0)
  if (!salary || !worker?.joining_date || !lastWorkingDate) return 0
  const start = new Date(worker.joining_date)
  const end = new Date(lastWorkingDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0
  const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25)
  if (years < 1) return 0
  const daily = salary / 30
  const amount = years <= 5
    ? years * 21 * daily
    : (5 * 21 * daily) + ((years - 5) * 30 * daily)
  return Math.round(amount * 100) / 100
}

function withSettlementTotal(next) {
  const total = Number(next.gratuity || 0)
    + Number(next.finalPayroll || 0)
    + Number(next.leavePay || 0)
    + Number(next.manualAdjustments || 0)
    - Number(next.deductions || 0)
  return { ...next, amount: Math.round(total * 100) / 100 }
}

function getTrackLabel(worker) {
  const track = worker?.entry_track
    || (worker?.category === 'Permanent Staff' || worker?.category === 'Office Staff' ? 'direct_staff' : null)
    || (worker?.category === 'Subcontract Worker' ? 'subcontractor_company_worker' : null)
    || (worker?.category === 'Contract Worker' ? 'contract_worker' : null)
  return TRACK_LABELS[track] || track || 'Worker'
}

function getStepState(record) {
  const checklist = record?.checklist || {}
  const hasExitDocument = checklist.final_payslip_issued?.done || checklist.eos_approved?.done
  const hasClearance = checklist.exit_clearance_signed?.done
  const hasSettlement = Number(record?.eos_amount || 0) > 0 || checklist.eos_approved?.done
  return {
    initiated: true,
    documents: checklist.final_payslip_issued?.done || checklist.visa_cancellation_initiated?.done || hasExitDocument,
    settlement: hasSettlement,
    clearance: hasClearance,
    closure: record?.status === 'closed',
  }
}

export default function OffboardingExitPage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [selected, setSelected] = useState(null)
  const [showInitiate, setShowInitiate] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closeResult, setCloseResult] = useState(null)
  const [form, setForm] = useState({ worker_id: '', reason: 'Resignation', last_working_date: '' })
  const [exitFile, setExitFile] = useState(null)
  const [exitDocType, setExitDocType] = useState(defaultExitDocType('Resignation'))
  const [detailFile, setDetailFile] = useState(null)
  const [detailDocType, setDetailDocType] = useState('eos_calculation')
  const [payrollLines, setPayrollLines] = useState([])
  const [settlement, setSettlement] = useState({ gratuity: 0, finalPayroll: 0, leavePay: 0, manualAdjustments: 0, deductions: 0, amount: 0 })
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (selectedId = null) => {
    setLoading(true)
    setError('')
    try {
      const [{ data: activeWorkers, error: workersError }, offboardingRows] = await Promise.all([
        supabase
          .from('workers')
          .select('*')
          .eq('status', 'active')
          .order('worker_number'),
        getOffboardingRecords(),
      ])
      if (workersError) throw workersError
      setWorkers(activeWorkers || [])
      setRecords(offboardingRows)
      if (selectedId) setSelected(offboardingRows.find(o => o.id === selectedId) || null)
    } catch (err) {
      console.error('Failed to load offboarding records', err)
      setError(err.message || 'Failed to load offboarding records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(null)
  }, [load])

  useEffect(() => {
    if (!selected) return
    const worker = selected.worker || {}
    const gratuity = calculateServiceGratuity(worker, selected.last_working_date)
    const draft = {
      gratuity,
      finalPayroll: 0,
      leavePay: 0,
      manualAdjustments: 0,
      deductions: 0,
      amount: 0,
    }
    setSettlement(selected.eos_amount ? { ...draft, amount: Number(selected.eos_amount) } : withSettlementTotal(draft))
    setDetailDocType(defaultExitDocType(selected.reason))
    setDetailFile(null)
  }, [selected])

  useEffect(() => {
    if (!selected?.worker_id) {
      setPayrollLines([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const rows = await getPayrollByWorker(selected.worker_id)
        if (!cancelled) setPayrollLines(rows)
      } catch (err) {
        console.error('Failed to load worker payroll for offboarding', err)
        if (!cancelled) setPayrollLines([])
      }
    })()
    return () => { cancelled = true }
  }, [selected?.worker_id])

  async function refresh() {
    await load(selected?.id)
  }

  async function handleInitiate() {
    if (!form.worker_id || !form.last_working_date) return
    const fileError = validateExitFile(exitFile)
    if (fileError) {
      setError(fileError)
      return
    }
    setBusy(true)
    setError('')
    try {
      await startOffboarding(form.worker_id, {
        reason: form.reason,
        last_working_date: form.last_working_date,
      })
      if (exitFile) {
        const worker = workers.find(w => w.id === form.worker_id)
        if (!worker) throw new Error('Worker data missing - reload and try again.')
        const { path, bucket } = await uploadWorkerDocument(worker, exitDocType, exitFile)
        await upsertDocument(worker.id, exitDocType, {
          label: EXIT_DOC_OPTIONS.find(o => o.value === exitDocType)?.label || 'Exit Document',
          status: 'valid',
          is_blocking: false,
          file_url: `${bucket}::${path}`,
          uploaded_at: new Date().toISOString(),
          notes: `Uploaded during offboarding initiation (${form.reason})`,
          updated_at: new Date().toISOString(),
        })
      }
      await refresh()
      setShowInitiate(false)
      setForm({ worker_id: '', reason: 'Resignation', last_working_date: '' })
      setExitFile(null)
      setExitDocType(defaultExitDocType('Resignation'))
    } catch (err) {
      console.error('Failed to initiate offboarding', err)
      setError(err.message || 'Failed to initiate offboarding')
    } finally {
      setBusy(false)
    }
  }

  async function handleTick(itemKey) {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      await updateOffboarding(selected.id, { [itemKey]: true })
      await refresh()
    } catch (err) {
      console.error('Failed to update offboarding checklist', err)
      setError(err.message || 'Failed to update offboarding checklist')
    } finally {
      setBusy(false)
    }
  }

  async function handleUploadExitDocument() {
    if (!selected || !detailFile) return
    const fileError = validateExitFile(detailFile)
    if (fileError) {
      setError(fileError)
      return
    }
    setBusy(true)
    setError('')
    try {
      const worker = selected.worker
      if (!worker?.worker_number) throw new Error('Worker data missing - reload and try again.')
      const { path, bucket } = await uploadWorkerDocument(worker, detailDocType, detailFile)
      await upsertDocument(worker.id, detailDocType, {
        label: EXIT_DOC_OPTIONS.find(o => o.value === detailDocType)?.label || 'Exit Document',
        status: 'valid',
        is_blocking: false,
        file_url: `${bucket}::${path}`,
        uploaded_at: new Date().toISOString(),
        notes: `Uploaded from Offboarding (${selected.reason})`,
        updated_at: new Date().toISOString(),
      })
      setDetailFile(null)
      await refresh()
    } catch (err) {
      console.error('Failed to upload offboarding document', err)
      setError(err.message || 'Failed to upload offboarding document')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveSettlement() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      await updateOffboarding(selected.id, { eos_amount: Number(settlement.amount || 0) })
      await refresh()
    } catch (err) {
      console.error('Failed to save settlement amount', err)
      setError(err.message || 'Failed to save settlement amount')
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerateDocument(kind) {
    if (!selected?.worker) return
    const {
      exitClearanceHTML,
      experienceLetterHTML,
      finalSettlementHTML,
      resignationAcceptanceHTML,
      terminationWithNoticeHTML,
      terminationWithoutNoticeHTML,
    } = await import('../../lib/letterTemplates')
    const worker = { ...selected.worker, end_date: selected.last_working_date }
    const today = new Date().toISOString().split('T')[0]
    let html = ''
    let ref = ''
    if (kind === 'resignation') {
      ref = refFor('RES', worker.worker_number)
      html = resignationAcceptanceHTML(worker, {
        resignation_date: selected.created_at?.split('T')[0] || today,
        last_working_date: selected.last_working_date,
        notice_period: 'As recorded',
      }, ref, today)
    } else if (kind === 'termination') {
      ref = refFor('TER', worker.worker_number)
      if (selected.reason === 'Absconding') {
        html = terminationWithoutNoticeHTML(worker, {
          ground_key: 'misconduct',
          effective_date: selected.last_working_date,
          additional_details: selected.reason,
        }, ref, today)
      } else {
        html = terminationWithNoticeHTML(worker, {
          notice_days: 30,
          last_working_date: selected.last_working_date,
          reason: selected.reason,
          reason_body: '',
        }, ref, today)
      }
    } else if (kind === 'experience') {
      ref = refFor('EXP', worker.worker_number)
      html = experienceLetterHTML(worker, ref, today)
    } else if (kind === 'clearance') {
      ref = refFor('CLR', worker.worker_number)
      html = exitClearanceHTML(worker, selected, ref, today)
    } else if (kind === 'settlement') {
      ref = refFor('FFS', worker.worker_number)
      html = finalSettlementHTML(worker, selected, payrollLines, settlement, ref, today)
    }
    setViewerRef(ref)
    setViewerHtml(html)
  }

  function handleTryClose() {
    const result = canCloseOffboardingRecord(selected)
    setCloseResult(result)
    setShowCloseConfirm(true)
  }

  async function handleConfirmClose() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const result = await closeWorkerFile(selected.worker_id, selected.id)
      if (result.success) {
        await refresh()
        setSelected(null)
      } else {
        setCloseResult({ can: false, missing: result.missing || [] })
      }
      setShowCloseConfirm(false)
    } catch (err) {
      console.error('Failed to close worker file', err)
      setError(err.message || 'Failed to close worker file')
    } finally {
      setBusy(false)
    }
  }

  const inProgress = records.filter(r => r.status === 'in_progress')
  const closed = records.filter(r => r.status === 'closed')
  const requiredCount = OFFBOARDING_ITEMS.filter(i => i.required).length
  const outstandingItems = inProgress.reduce((sum, r) => {
    return sum + OFFBOARDING_ITEMS.filter(i => i.required && !r.checklist[i.key]?.done).length
  }, 0)
  const reasonOptions = ['Resignation', 'Contract End', 'Termination', 'Redundancy', 'Medical', 'Absconding', 'Other']
  const latestPayroll = payrollLines[0]

  return (
    <AppShell pageTitle="Offboarding">
      <PageHeader
        eyebrow="Offboarding"
        title="Offboarding"
        description="Run worker exits through documents, payroll settlement, clearance, and final file closure."
        actions={<button className="btn btn-danger" onClick={() => setShowInitiate(true)} disabled={busy}>+ Initiate Offboarding</button>}
      />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${inProgress.length > 0 ? 'warning' : ''}`} style={{ fontSize: 20 }}>{inProgress.length}</div><div className="lbl">In progress</div></div>
        <div className="stat-card"><div className="num success" style={{ fontSize: 20 }}>{closed.length}</div><div className="lbl">Closed</div></div>
        <div className="stat-card"><div className={`num ${outstandingItems > 0 ? 'danger' : 'success'}`} style={{ fontSize: 20 }}>{outstandingItems}</div><div className="lbl">Outstanding items</div></div>
        <div className="stat-card"><div className="num" style={{ fontSize: 20 }}>{requiredCount}</div><div className="lbl">Required steps</div></div>
      </div>

      {inProgress.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#9a3412', fontWeight: 500 }}>
          {inProgress.length} worker{inProgress.length > 1 ? 's are' : ' is'} in active offboarding. Worker files cannot be closed until all required checklist items are ticked.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="panel">
          <div className="panel-header"><div><h2>Offboarding records</h2></div></div>
          {loading ? (
            <div className="empty-state"><h3>Loading offboarding records</h3><p>Checking Supabase records.</p></div>
          ) : records.length === 0 ? (
            <div className="empty-state"><h3>No offboarding records</h3><p>Initiate offboarding when a worker leaves.</p></div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Worker</th><th>Track</th><th>Reason</th><th>Last day</th><th>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {records.map(r => {
                  const done = OFFBOARDING_ITEMS.filter(i => i.required && r.checklist[i.key]?.done).length
                  const pct = requiredCount ? Math.round((done / requiredCount) * 100) : 0
                  return (
                    <tr key={r.id} style={{ cursor: 'pointer', background: selected?.id === r.id ? '#eff6ff' : '' }} onClick={() => setSelected(r)}>
                      <td style={{ fontWeight: 500 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><WorkerAvatar workerId={r.worker_id} name={r.worker_name} size={34} /><div>{r.worker_name}<div style={{ fontSize: 11, color: 'var(--hint)' }}>{r.worker_number}</div></div></div></td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{getTrackLabel(r.worker)}</td>
                      <td style={{ fontSize: 12 }}>{r.reason}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(r.last_working_date)}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}><div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--success)' : 'var(--warning)', borderRadius: 2 }} /></div><span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{done}/{requiredCount}</span></div></td>
                      <td><StatusBadge label={r.status} tone={r.status === 'closed' ? 'success' : 'warning'} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          )}
        </div>

        {selected && (
          <div className="panel">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><WorkerAvatar workerId={selected.worker_id} name={selected.worker_name} size={48} /><div><h2>{selected.worker_name}</h2><p>{selected.worker_number} - {getTrackLabel(selected.worker)} - {selected.reason} - Last day: {formatDate(selected.last_working_date)}</p></div></div>
              <StatusBadge label={selected.status} tone={selected.status === 'closed' ? 'success' : 'warning'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
              {(() => {
                const stepState = getStepState(selected)
                return STEP_DEFINITIONS.map((step, index) => {
                  const complete = Boolean(stepState[step.key])
                  return (
                    <div key={step.key} style={{ border: `1px solid ${complete ? '#86efac' : 'var(--border)'}`, background: complete ? '#f0fdf4' : '#f8fafc', borderRadius: 8, padding: '10px 8px', minHeight: 58 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 999, background: complete ? 'var(--success)' : '#e2e8f0', color: complete ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{index + 1}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: complete ? '#166534' : 'var(--muted)', lineHeight: 1.25 }}>{step.label}</div>
                    </div>
                  )
                })
              })()}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Exit Documents</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {selected.reason === 'Resignation'
                  ? <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateDocument('resignation')}>Resignation acceptance</button>
                  : <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateDocument('termination')}>Termination notice</button>}
                <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateDocument('clearance')}>Exit clearance</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateDocument('settlement')}>Full & final settlement</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateDocument('experience')}>Experience letter</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 8, alignItems: 'center' }}>
                <select className="form-select" value={detailDocType} onChange={e => setDetailDocType(e.target.value)} disabled={busy || selected.status === 'closed'}>
                  {EXIT_DOC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-input" onChange={e => setDetailFile(e.target.files?.[0] || null)} disabled={busy || selected.status === 'closed'} />
                <button className="btn btn-teal btn-sm" onClick={handleUploadExitDocument} disabled={busy || selected.status === 'closed' || !detailFile}>Upload</button>
              </div>
            </div>

            <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Settlement Draft</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Latest payroll: {latestPayroll?.batch?.month_label || 'No payroll line found'} {latestPayroll?.batch?.status ? `(${latestPayroll.batch.status})` : ''}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>{formatCurrency(settlement.amount)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div className="form-field"><label className="form-label">EOS gratuity</label><input className="form-input" type="number" value={settlement.gratuity} onChange={e => setSettlement(current => withSettlementTotal({ ...current, gratuity: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Final payroll</label><input className="form-input" type="number" value={settlement.finalPayroll} onChange={e => setSettlement(current => withSettlementTotal({ ...current, finalPayroll: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Leave / earnings</label><input className="form-input" type="number" value={settlement.leavePay} onChange={e => setSettlement(current => withSettlementTotal({ ...current, leavePay: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Adjustments</label><input className="form-input" type="number" value={settlement.manualAdjustments} onChange={e => setSettlement(current => withSettlementTotal({ ...current, manualAdjustments: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Deductions</label><input className="form-input" type="number" value={settlement.deductions} onChange={e => setSettlement(current => withSettlementTotal({ ...current, deductions: e.target.value }))} /></div>
                <div className="form-field"><label className="form-label">Net settlement</label><input className="form-input" type="number" value={settlement.amount} onChange={e => setSettlement({ ...settlement, amount: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-teal btn-sm" onClick={handleSaveSettlement} disabled={busy || selected.status === 'closed'}>Save settlement amount</button>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exit Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {OFFBOARDING_ITEMS.map(item => {
                const state = selected.checklist[item.key]
                const isDone = state?.done
                return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', opacity: selected.status === 'closed' ? 0.7 : 1 }}>
                    <div
                      style={{ width: 22, height: 22, borderRadius: 4, border: `2px solid ${isDone ? 'var(--success)' : 'var(--border)'}`, background: isDone ? 'var(--success)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: selected.status !== 'closed' && !isDone ? 'pointer' : 'default' }}
                      onClick={() => { if (!isDone && selected.status !== 'closed' && !busy) handleTick(item.key) }}
                    >
                      {isDone && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>OK</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: isDone ? 400 : 500, color: isDone ? 'var(--muted)' : 'var(--text)', textDecoration: isDone ? 'line-through' : 'none' }}>{item.label}</div>
                      {isDone && <div style={{ fontSize: 10, color: 'var(--hint)' }}>Complete</div>}
                    </div>
                    {item.required
                      ? <span style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: 10 }}>REQUIRED</span>
                      : <span style={{ fontSize: 9, color: 'var(--hint)', background: 'var(--surface)', padding: '2px 6px', borderRadius: 10 }}>optional</span>
                    }
                  </div>
                )
              })}
            </div>

            {selected.status !== 'closed' && (
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleTryClose} disabled={busy}>Close Worker File</button>
                {(() => {
                  const { can, missing } = canCloseOffboardingRecord(selected)
                  if (!can) return <div style={{ fontSize: 11, color: '#dc2626', marginTop: 8, lineHeight: 1.6 }}>Cannot close - {missing.length} required item{missing.length > 1 ? 's' : ''} outstanding</div>
                  return <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 8 }}>All required items complete - ready to close</div>
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {showInitiate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 420, background: 'white', height: '100%', padding: 24, overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Initiate Offboarding</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInitiate(false)}>x</button>
            </div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#9a3412' }}>
              Once initiated, the worker file cannot be closed until all required exit checklist items are completed.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-field"><label className="form-label">Worker *</label><select className="form-select" value={form.worker_id} onChange={e => setForm({ ...form, worker_id: e.target.value })}><option value="">Select active worker</option>{workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}</select></div>
              <div className="form-field"><label className="form-label">Reason *</label><select className="form-select" value={form.reason} onChange={e => { setForm({ ...form, reason: e.target.value }); setExitDocType(defaultExitDocType(e.target.value)) }}>{reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Last working date *</label><input className="form-input" type="date" value={form.last_working_date} onChange={e => setForm({ ...form, last_working_date: e.target.value })} /></div>
              <div className="form-field"><label className="form-label">Supporting document type</label><select className="form-select" value={exitDocType} onChange={e => setExitDocType(e.target.value)}>{EXIT_DOC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Upload supporting document</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-input" onChange={e => setExitFile(e.target.files?.[0] || null)} /><div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 4 }}>Optional now, but required before closure if it is the official resignation/termination paper.</div></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowInitiate(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleInitiate} disabled={busy}>{busy ? 'Saving...' : 'Initiate Offboarding'}</button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && closeResult && (
        closeResult.can
          ? <ConfirmDialog title="Close worker file?" message="All required checklist items are complete. This will mark the worker as inactive and close their file. This action cannot be undone." confirmLabel="Close File" confirmTone="btn-danger" onConfirm={handleConfirmClose} onCancel={() => setShowCloseConfirm(false)} />
          : <ConfirmDialog title="Cannot close file" message={`${closeResult.missing.length} required item${closeResult.missing.length > 1 ? 's are' : ' is'} not yet complete. All required items must be ticked before the file can be closed.`} confirmLabel="OK" confirmTone="btn-secondary" onConfirm={() => setShowCloseConfirm(false)} onCancel={() => setShowCloseConfirm(false)} />
      )}
      {viewerHtml && <LetterViewer html={viewerHtml} refNumber={viewerRef} onClose={() => { setViewerHtml(null); setViewerRef('') }} />}
    </AppShell>
  )
}

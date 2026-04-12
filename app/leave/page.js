'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getVisibleWorkers, getLeaveEligibility, calculateLeaveDays, calculateSalaryHold, confirmWorkerReturn, checkNonReturnStatus, getWorker, makeId, addPenaltyDeduction } from '../../lib/mockStore'
import { getLeaveRecords, addLeaveRequest as addLeaveRecord, updateLeaveRecord } from '../../lib/leaveService'
import { formatDate, getStatusTone, formatCurrency } from '../../lib/utils'

const TODAY = new Date().toISOString().split('T')[0]

export default function LeavePage() {
  const [leaveRecords, setLeaveRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [activeTab, setActiveTab] = useState('active')
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [addForm, setAddForm] = useState({ worker_id: '', start_date: '', end_date: '', notes: '', request_doc_file: null, ticket_proof_file: null })
  const [eligibility, setEligibility] = useState(null)
  const [nonReturnAlerts, setNonReturnAlerts] = useState([])
  const [rejectReason, setRejectReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refreshData = async () => {
    const rows = await getLeaveRecords()
    setLeaveRecords(rows || [])
    setWorkers(getVisibleWorkers().filter(w => w.active !== false))
    setNonReturnAlerts(checkNonReturnStatus())
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        if (!cancelled) await refreshData()
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load leave')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Stat calculations
  const onLeaveNow = leaveRecords.filter(r => r.status === 'approved' && r.start_date <= TODAY && r.end_date >= TODAY).length
  const pendingApproval = leaveRecords.filter(r => r.status === 'pending_owner').length
  const returningThisWeek = leaveRecords.filter(r => {
    if (!r.expected_return_date || r.status !== 'approved') return false
    const ret = r.expected_return_date
    const weekFromNow = new Date(TODAY)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    return ret >= TODAY && ret <= weekFromNow.toISOString().split('T')[0]
  }).length
  const nonReturnCount = nonReturnAlerts.filter(a => a.days_overdue > 0).length

  const tabs = [
    ['active', 'Active Leave'],
    ['pending', 'Pending Approval'],
    ['history', 'History'],
    ['non_return', 'Non-Return']
  ]

  // Tab data
  const activeRecords = leaveRecords.filter(r => r.status === 'approved' && !r.return_confirmed)
  const pendingRecords = leaveRecords.filter(r => r.status === 'pending_owner')
  const historyRecords = leaveRecords.filter(r => ['returned', 'rejected', 'cancelled'].includes(r.status) || (r.status === 'approved' && r.return_confirmed))

  const getLeaveStatus = (r) => {
    if (r.start_date <= TODAY && r.end_date >= TODAY) return { label: 'On Leave', tone: 'success' }
    if (r.start_date > TODAY) return { label: 'Upcoming', tone: 'info' }
    if (r.expected_return_date && r.expected_return_date < TODAY && !r.return_confirmed) return { label: 'Overdue', tone: 'danger' }
    return { label: r.status, tone: getStatusTone(r.status) }
  }

  const handleConfirmReturn = async (record) => {
    confirmWorkerReturn(record.id, 'HR Admin')
    try { await refreshData() } catch (err) { setLoadError(err?.message || 'Failed to refresh leave') }
  }

  const handleApprove = async () => {
    if (!selectedLeave) return
    try { await updateLeaveRecord(selectedLeave.id, { status: 'approved', approved_by: 'Management', approved_at: new Date().toISOString() }) } catch (err) { setLoadError(err?.message || 'Failed to approve leave') }
    setSelectedLeave(null)
    try { await refreshData() } catch (err) { setLoadError(err?.message || 'Failed to refresh leave') }
  }

  const handleReject = async () => {
    if (!selectedLeave) return
    try { await updateLeaveRecord(selectedLeave.id, { status: 'rejected', rejected_by: 'Management', rejection_reason: rejectReason }) } catch (err) { setLoadError(err?.message || 'Failed to reject leave') }
    setSelectedLeave(null)
    setRejectReason('')
    try { await refreshData() } catch (err) { setLoadError(err?.message || 'Failed to refresh leave') }
  }

  const handleAddSubmit = async () => {
    if (!addForm.worker_id || !addForm.start_date || !addForm.end_date) return
    if (!eligibility || !eligibility.eligible) return
    if (!addForm.request_doc_file) { alert('Original Leave Request document is required.'); return }
    if (eligibility.under_24_months && !addForm.ticket_proof_file) { alert('Ticket Proof is required for workers under 24 months service.'); return }

    const days = calculateLeaveDays(addForm.start_date, addForm.end_date)
    if (days > eligibility.days_remaining) return

    const worker = workers.find(w => w.id === addForm.worker_id)
    const endDate = new Date(addForm.end_date)
    endDate.setDate(endDate.getDate() + 1)
    const expectedReturn = endDate.toISOString().split('T')[0]
    const holdAmount = calculateSalaryHold(addForm.worker_id)

    addLeaveRecord({
      id: makeId('lv'),
      worker_id: addForm.worker_id,
      worker_name: worker?.full_name || '',
      worker_number: worker?.worker_number || '',
      leave_type: 'annual',
      start_date: addForm.start_date,
      end_date: addForm.end_date,
      expected_return_date: expectedReturn,
      days_count: days,
      status: 'pending_owner',
      approved_by: null,
      notes: addForm.notes,
      request_doc_file: addForm.request_doc_file?.name || null,
      ticket_proof_file: addForm.ticket_proof_file?.name || null,
      salary_hold_amount: holdAmount,
      return_confirmed: false,
      salary_hold_released: false
    })

    addPenaltyDeduction({
      id: makeId('pd'),
      worker_id: addForm.worker_id,
      worker_name: worker?.full_name || '',
      type: 'leave_salary_hold',
      status: 'pending_approval',
      amount: holdAmount,
      description: `Annual leave salary hold — ${addForm.start_date} to ${addForm.end_date}`,
      created_at: TODAY
    })

    setShowAddDrawer(false)
    setAddForm({ worker_id: '', start_date: '', end_date: '', notes: '', request_doc_file: null, ticket_proof_file: null })
    setEligibility(null)
    try { await refreshData() } catch (err) { setLoadError(err?.message || 'Failed to refresh leave') }
  }

  const handleWorkerChange = (workerId) => {
    setAddForm({ ...addForm, worker_id: workerId })
    if (workerId) {
      setEligibility(getLeaveEligibility(workerId))
    } else {
      setEligibility(null)
    }
  }

  const calcDays = addForm.start_date && addForm.end_date ? calculateLeaveDays(addForm.start_date, addForm.end_date) : 0
  const holdAmount = addForm.worker_id ? calculateSalaryHold(addForm.worker_id) : 0
  const expectedReturnDisplay = addForm.end_date ? (() => { const d = new Date(addForm.end_date); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })() : ''

  const eligibleWorkers = workers.filter(w => w.category === 'Permanent Staff' || w.category === 'Office Staff')

  const reviewWorker = selectedLeave ? getWorker(selectedLeave.worker_id) : null
  const reviewEligibility = selectedLeave ? getLeaveEligibility(selectedLeave.worker_id) : null
  const reviewHold = selectedLeave ? calculateSalaryHold(selectedLeave.worker_id) : 0

  const actionLabel = (stage) => {
    if (stage === 'monitor') return 'Monitor'
    if (stage === 'warning_1') return 'Issue Warning 1'
    if (stage === 'warning_2') return 'Issue Warning 2'
    if (stage === 'termination_approval') return 'Request Termination'
    return stage
  }

  const actionTone = (stage) => {
    if (stage === 'monitor') return 'neutral'
    if (stage === 'warning_1') return 'warning'
    if (stage === 'warning_2') return 'danger'
    if (stage === 'termination_approval') return 'danger'
    return 'neutral'
  }

  return (
    <AppShell pageTitle="Leave">
      <PageHeader eyebrow="Leave Management" title="Annual Leave" description="Manage annual leave requests, salary holds, and non-return tracking."
        actions={<button style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowAddDrawer(true)}>+ Add Leave</button>} />

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'On Leave Now', value: onLeaveNow, tone: 'success' },
          { label: 'Pending Approval', value: pendingApproval, tone: 'warning' },
          { label: 'Returning This Week', value: returningThisWeek, tone: 'info' },
          { label: 'Non-Return Alerts', value: nonReturnCount, tone: nonReturnCount > 0 ? 'danger' : 'neutral' }
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.tone === 'danger' ? '#dc3545' : s.tone === 'success' ? '#198754' : s.tone === 'warning' ? '#e67e22' : s.tone === 'info' ? '#0d6efd' : '#6b7280' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Non-Return Banner */}
      {nonReturnAlerts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6, fontSize: 13 }}>Non-Return Alerts</div>
          {nonReturnAlerts.map(a => (
            <div key={a.leave_id} style={{ fontSize: 12, color: '#991b1b', marginBottom: 2 }}>
              {a.worker_name} ({a.worker_number}) — {a.days_overdue} day(s) overdue, expected return {formatDate(a.expected_return)}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '10px 20px', border: 'none', borderBottom: activeTab === key ? '2px solid #0d6efd' : '2px solid transparent',
            background: 'none', fontWeight: activeTab === key ? 600 : 400, color: activeTab === key ? '#0d6efd' : '#6b7280',
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
          }}>
            {label}
            {key === 'non_return' && nonReturnAlerts.length > 0 && (
              <span style={{ background: '#dc3545', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{nonReturnAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active Leave Tab */}
      {activeTab === 'active' && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {activeRecords.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No active leave records</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Worker</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Type</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Start</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>End</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Days</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Expected Return</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Salary Hold</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map(r => {
                    const st = getLeaveStatus(r)
                    const showConfirm = (r.expected_return_date && r.expected_return_date <= TODAY) || r.end_date < TODAY
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.worker_name}<div style={{ fontSize: 11, color: '#9ca3af' }}>{r.worker_number}</div></td>
                        <td style={{ padding: '10px 12px' }}><StatusBadge label={r.leave_type} tone="neutral" /></td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{formatDate(r.start_date)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{formatDate(r.end_date)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.days_count}</td>
                        <td style={{ padding: '10px 12px' }}><StatusBadge label={st.label} tone={st.tone} /></td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{r.expected_return_date ? formatDate(r.expected_return_date) : '-'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {r.salary_hold_released
                            ? <span style={{ color: '#198754', fontWeight: 500, fontSize: 12 }}>Released &#10003;</span>
                            : <span style={{ color: '#e67e22', fontWeight: 500, fontSize: 12 }}>{formatCurrency(calculateSalaryHold(r.worker_id))} &mdash; Held</span>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {showConfirm && (
                            <button onClick={() => handleConfirmReturn(r)} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Confirm Return</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {pendingRecords.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No pending leave requests</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Worker</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Requested</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Start</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>End</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Days</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Eligibility</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRecords.map(r => {
                    const elig = getLeaveEligibility(r.worker_id)
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.worker_name}<div style={{ fontSize: 11, color: '#9ca3af' }}>{r.worker_number}</div></td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{formatDate(r.created_at || r.start_date)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{formatDate(r.start_date)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{formatDate(r.end_date)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.days_count}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {elig.eligible
                            ? <StatusBadge label={`${elig.days_remaining}d remaining`} tone="success" />
                            : <StatusBadge label="Not eligible" tone="danger" />}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button onClick={() => { setSelectedLeave(r); setRejectReason('') }} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Review</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {historyRecords.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No history records</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Worker</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Period</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Days</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Return Confirmed</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Salary Released</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.worker_name}<div style={{ fontSize: 11, color: '#9ca3af' }}>{r.worker_number}</div></td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{formatDate(r.start_date)} &mdash; {formatDate(r.end_date)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.days_count}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge label={r.status} tone={getStatusTone(r.status)} /></td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>
                        {r.return_confirmed
                          ? <span style={{ color: '#198754' }}>Yes — {r.return_confirmed_by} ({formatDate(r.return_confirmed_at)})</span>
                          : <span style={{ color: '#9ca3af' }}>-</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>
                        {r.salary_hold_released
                          ? <span style={{ color: '#198754' }}>Released</span>
                          : <span style={{ color: '#9ca3af' }}>-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Non-Return Tab */}
      {activeTab === 'non_return' && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {nonReturnAlerts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No non-return alerts</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Worker</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Expected Return</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Days Overdue</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Salary Hold</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Action Required</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nonReturnAlerts.map(a => (
                    <tr key={a.leave_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{a.worker_name}<div style={{ fontSize: 11, color: '#9ca3af' }}>{a.worker_number}</div></td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{formatDate(a.expected_return)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#dc3545' }}>{a.days_overdue}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 500, color: '#e67e22' }}>{formatCurrency(a.salary_hold)}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge label={a.action_required} tone={actionTone(a.action_required)} /></td>
                      <td style={{ padding: '10px 12px' }}>
                        <button style={{ background: actionTone(a.action_required) === 'danger' ? '#dc3545' : actionTone(a.action_required) === 'warning' ? '#e67e22' : '#6b7280', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                          {actionLabel(a.action_required)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Leave Drawer */}
      {showAddDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: 520, height: '100vh', background: '#fff', zIndex: 100, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Leave Request</h2>
            <button onClick={() => { setShowAddDrawer(false); setEligibility(null); setAddForm({ worker_id: '', start_date: '', end_date: '', notes: '', request_doc_file: null, ticket_proof_file: null }) }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>&times;</button>
          </div>

          {/* Step 1 — Worker Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Step 1 — Select Worker</label>
            <select value={addForm.worker_id} onChange={e => handleWorkerChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
              <option value="">Select worker...</option>
              {eligibleWorkers.map(w => <option key={w.id} value={w.id}>{w.full_name} — {w.category} ({w.worker_number})</option>)}
            </select>
          </div>

          {eligibility && !eligibility.eligible && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 13, marginBottom: 4 }}>Not Eligible</div>
              <div style={{ fontSize: 12, color: '#991b1b' }}>{eligibility.reason}</div>
              {eligibility.months_served !== undefined && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{eligibility.months_served} / 12 months served</div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ background: '#dc3545', height: '100%', width: `${Math.min(100, (eligibility.months_served / 12) * 100)}%`, borderRadius: 4 }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {eligibility && eligibility.eligible && (
            <>
              <div style={{ background: eligibility.under_24_months ? '#fffbeb' : '#f0fdf4', border: `1px solid ${eligibility.under_24_months ? '#fde68a' : '#bbf7d0'}`, borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontWeight: 600, color: eligibility.under_24_months ? '#92400e' : '#166534', fontSize: 13, marginBottom: 6 }}>
                  {eligibility.under_24_months ? 'Eligible (Management Discretion)' : 'Eligible'}
                </div>
                <div style={{ fontSize: 12, color: '#374151', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <span>Months served: <b>{eligibility.months_served}</b></span>
                  <span>Entitlement: <b>{eligibility.days_entitlement} days</b></span>
                  <span>Days used: <b>{eligibility.days_used}</b></span>
                  <span>Days remaining: <b>{eligibility.days_remaining}</b></span>
                </div>
                {eligibility.under_24_months && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '6px 8px', borderRadius: 4 }}>
                    Worker is between 12-24 months service. Leave is at management discretion. Self-purchased ticket proof is mandatory.
                  </div>
                )}
              </div>

              {/* Step 2 — Leave Dates */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Step 2 — Leave Dates</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Start Date</label>
                    <input type="date" value={addForm.start_date} onChange={e => setAddForm({ ...addForm, start_date: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>End Date</label>
                    <input type="date" value={addForm.end_date} onChange={e => setAddForm({ ...addForm, end_date: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                  </div>
                </div>
                {calcDays > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#374151' }}>
                    <b>{calcDays} calendar days</b> (includes weekends and public holidays)
                  </div>
                )}
                {calcDays > 0 && calcDays > eligibility.days_remaining && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#dc3545', fontWeight: 500 }}>
                    Exceeds remaining entitlement of {eligibility.days_remaining} days
                  </div>
                )}
                {expectedReturnDisplay && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>Expected return: {formatDate(expectedReturnDisplay)}</div>
                )}
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Notes</label>
                  <textarea value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical' }} />
                </div>
              </div>

              {/* Step 3 — Documents */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Step 3 — Documents</label>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Original Leave Request (PDF/JPG/PNG) *</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setAddForm({ ...addForm, request_doc_file: e.target.files[0] || null })} style={{ fontSize: 12 }} />
                </div>
                {eligibility.under_24_months && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Ticket Proof — Self-Purchased *</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setAddForm({ ...addForm, ticket_proof_file: e.target.files[0] || null })} style={{ fontSize: 12 }} />
                  </div>
                )}
              </div>

              {/* Step 4 — Salary Hold Summary */}
              {addForm.worker_id && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Step 4 — Salary Hold</label>
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
                    {(() => {
                      const w = workers.find(wk => wk.id === addForm.worker_id)
                      if (!w) return null
                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>Basic Salary</span><span>{formatCurrency(w.monthly_salary)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>Allowances</span><span>{formatCurrency((w.housing_allowance || 0) + (w.transport_allowance || 0) + (w.food_allowance || 0))}</span>
                          </div>
                          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                            <span>Total Hold</span><span style={{ color: '#e67e22' }}>{formatCurrency(holdAmount)}</span>
                          </div>
                        </>
                      )
                    })()}
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, lineHeight: 1.4 }}>
                      This amount will appear as a deduction on the next payslip and will be released when return is confirmed by HR.
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 — Submit */}
              <button onClick={handleAddSubmit} disabled={!addForm.worker_id || !addForm.start_date || !addForm.end_date || calcDays > eligibility.days_remaining || !addForm.request_doc_file || (eligibility.under_24_months && !addForm.ticket_proof_file)} style={{
                width: '100%', padding: '10px 0', background: (!addForm.worker_id || !addForm.start_date || !addForm.end_date || calcDays > eligibility.days_remaining || !addForm.request_doc_file || (eligibility.under_24_months && !addForm.ticket_proof_file)) ? '#9ca3af' : '#0d6efd',
                color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>
                Submit for Owner Approval
              </button>
            </>
          )}
        </div>
      )}

      {/* Review Drawer */}
      {selectedLeave && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#fff', zIndex: 100, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Review Leave Request</h2>
            <button onClick={() => { setSelectedLeave(null); setRejectReason('') }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>&times;</button>
          </div>

          {/* Worker Info */}
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, marginBottom: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{selectedLeave.worker_name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{selectedLeave.worker_number}</div>
            {reviewWorker && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{reviewWorker.category} &mdash; {reviewWorker.trade_role}</div>}
          </div>

          {/* Eligibility */}
          {reviewEligibility && (
            <div style={{ background: reviewEligibility.eligible ? '#f0fdf4' : '#fef2f2', border: `1px solid ${reviewEligibility.eligible ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: reviewEligibility.eligible ? '#166534' : '#dc2626', marginBottom: 4 }}>
                {reviewEligibility.eligible ? 'Eligible' : 'Not Eligible'}
              </div>
              {reviewEligibility.eligible && (
                <div style={{ fontSize: 12, color: '#374151' }}>
                  {reviewEligibility.months_served} months served | {reviewEligibility.days_remaining} days remaining
                </div>
              )}
            </div>
          )}

          {/* Leave Details */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Leave Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div><span style={{ color: '#6b7280' }}>Type:</span> <b>{selectedLeave.leave_type}</b></div>
              <div><span style={{ color: '#6b7280' }}>Days:</span> <b>{selectedLeave.days_count}</b></div>
              <div><span style={{ color: '#6b7280' }}>Start:</span> <b>{formatDate(selectedLeave.start_date)}</b></div>
              <div><span style={{ color: '#6b7280' }}>End:</span> <b>{formatDate(selectedLeave.end_date)}</b></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Expected Return:</span> <b>{selectedLeave.expected_return_date ? formatDate(selectedLeave.expected_return_date) : '-'}</b></div>
            </div>
          </div>

          {/* Salary Hold */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Salary Hold</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e67e22' }}>{formatCurrency(reviewHold)}</div>
          </div>

          {/* Notes */}
          {selectedLeave.notes && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 12, color: '#6b7280', background: '#f9fafb', padding: 10, borderRadius: 6 }}>{selectedLeave.notes}</div>
            </div>
          )}

          {/* Email notification */}
          {reviewWorker?.email && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#1e40af' }}>Notify worker: <b>{reviewWorker.email}</b></div>
              <button onClick={() => navigator.clipboard?.writeText(reviewWorker.email)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Copy</button>
            </div>
          )}

          {/* Approval Actions */}
          {selectedLeave.status === 'pending_owner' && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Decision</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Rejection Reason (if rejecting)</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} placeholder="Enter reason for rejection..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleApprove} style={{ flex: 1, padding: '10px 0', background: '#198754', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                <button onClick={handleReject} disabled={!rejectReason.trim()} style={{ flex: 1, padding: '10px 0', background: rejectReason.trim() ? '#dc3545' : '#e5e7eb', color: rejectReason.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import {
  canCloseOffboardingRecord,
  closeWorkerFile,
  getOffboardingRecords,
  OFFBOARDING_ITEMS,
  startOffboarding,
  updateOffboarding,
} from '../../lib/offboardingService'
import { supabase } from '../../lib/supabaseClient'
import { formatDate } from '../../lib/utils'

export default function OffboardingExitPage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [selected, setSelected] = useState(null)
  const [showInitiate, setShowInitiate] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closeResult, setCloseResult] = useState(null)
  const [form, setForm] = useState({ worker_id: '', reason: 'Resignation', last_working_date: '' })
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
          .select('id, full_name, worker_number, category, status')
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

  async function refresh() {
    await load(selected?.id)
  }

  async function handleInitiate() {
    if (!form.worker_id || !form.last_working_date) return
    setBusy(true)
    setError('')
    try {
      await startOffboarding(form.worker_id, {
        reason: form.reason,
        last_working_date: form.last_working_date,
      })
      await refresh()
      setShowInitiate(false)
      setForm({ worker_id: '', reason: 'Resignation', last_working_date: '' })
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

  return (
    <AppShell pageTitle="Offboarding">
      <PageHeader
        eyebrow="Worker Exit"
        title="Worker exit & offboarding"
        description="Complete all exit checklist items before a worker file can be closed. Prevents double-payment and ensures compliance."
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
              <thead><tr><th>Worker</th><th>Reason</th><th>Last day</th><th>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {records.map(r => {
                  const done = OFFBOARDING_ITEMS.filter(i => i.required && r.checklist[i.key]?.done).length
                  const pct = requiredCount ? Math.round((done / requiredCount) * 100) : 0
                  return (
                    <tr key={r.id} style={{ cursor: 'pointer', background: selected?.id === r.id ? '#eff6ff' : '' }} onClick={() => setSelected(r)}>
                      <td style={{ fontWeight: 500 }}>{r.worker_name}<div style={{ fontSize: 11, color: 'var(--hint)' }}>{r.worker_number}</div></td>
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
              <div><h2>{selected.worker_name}</h2><p>{selected.worker_number} - {selected.reason} - Last day: {formatDate(selected.last_working_date)}</p></div>
              <StatusBadge label={selected.status} tone={selected.status === 'closed' ? 'success' : 'warning'} />
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
              <div className="form-field"><label className="form-label">Reason *</label><select className="form-select" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>{reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Last working date *</label><input className="form-input" type="date" value={form.last_working_date} onChange={e => setForm({ ...form, last_working_date: e.target.value })} /></div>
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
    </AppShell>
  )
}

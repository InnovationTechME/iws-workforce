'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getVisibleWorkers } from '../../lib/workerService'
import { getAllWarnings, addWarning, updateWarning } from '../../lib/warningService'
import { addLetter, generateRefNumber } from '../../lib/letterService'
import { formatDate, getStatusTone } from '../../lib/utils'
import { warningLetterHTML } from '../../lib/letterTemplates'
import LetterViewer from '../../components/LetterViewer'

function nextWarningType(rows, workerId) {
  const count = (rows || []).filter(row =>
    row.worker_id === workerId &&
    String(row.warning_type || '').toLowerCase() === 'warning'
  ).length
  if (count === 0) return 'warning_1st'
  if (count === 1) return 'warning_2nd'
  return 'warning_final'
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState([])
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const [form, setForm] = useState({ worker_id:'', warning_type:'warning', issue_date:new Date().toISOString().split('T')[0], reason:'', issued_by:'', status:'open', notes:'', penalty_amount:'', penalty_type:'' })
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const reloadWarnings = async () => {
    setWorkers(await getVisibleWorkers())
    const rows = await getAllWarnings()
    setWarnings(rows || [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        if (!cancelled) await reloadWarnings()
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load warnings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = filter === 'all' ? warnings : warnings.filter(w => w.status === filter)

  const handleAdd = async () => {
    if (!form.worker_id) { setFormErrors(['Worker is required']); return }
    if (!form.reason || !form.reason.trim()) { setFormErrors(['Reason is required']); return }
    setFormErrors([])
    const level = form.warning_type === 'memo' ? 'warning_1st' : nextWarningType(warnings, form.worker_id)
    try {
      await addWarning({
        ref_number: generateRefNumber(level),
        worker_id: form.worker_id,
        warning_type: form.warning_type,
        level,
        reason: form.reason.trim(),
        issued_by: form.issued_by || 'HR Admin',
        issue_date: form.issue_date,
        penalty_amount: form.penalty_amount ? Number(form.penalty_amount) : null,
        penalty_type: form.penalty_type || null,
        status: form.status || 'open',
      })
      await reloadWarnings()
    } catch (err) { setLoadError(err?.message || 'Failed to create warning') }
    setShowDrawer(false)
  }
  return (
    <>
    <AppShell pageTitle="Warnings">
      <PageHeader eyebrow="Disciplinary Records" title="Disciplinary records" description="Track warnings, memos, penalties, and disciplinary actions."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Create Record</button>} />

      <div className="summary-strip">
        {[['Open',warnings.filter(w=>w.status==='open').length,'danger'],['Monitoring',warnings.filter(w=>w.status==='monitoring').length,'warning'],['Closed',warnings.filter(w=>w.status==='closed').length,'success'],['Total',warnings.length,'neutral']].map(([label,count,tone]) => (
          <div key={label} className="stat-card"><div className={`num ${tone}`} style={{fontSize:20}}>{count}</div><div className="lbl">{label}</div></div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16}}>
        <div className="panel">
          <div className="toolbar">
            {['all','open','monitoring','closed'].map(s => <button key={s} className={`btn btn-sm ${filter===s?'btn-teal':'btn-secondary'}`} onClick={() => setFilter(s)}>{s}</button>)}
          </div>
          {filtered.length === 0 ? <div className="empty-state"><h3>No records in this queue</h3></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Worker</th><th>Type</th><th>Date</th><th>Status</th><th>Reason</th></tr></thead>
                <tbody>
                  {filtered.map(w => (
                    <tr key={w.id} style={{cursor:'pointer',background:selected?.id===w.id?'#eff6ff':''}} onClick={() => setSelected(w)}>
                      <td style={{fontWeight:500}}>{w.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{w.worker_number}</div></td>
                      <td><StatusBadge label={w.warning_type} tone={w.warning_type==='warning'?'danger':'neutral'} /></td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(w.issue_date)}</td>
                      <td><StatusBadge label={w.status} tone={getStatusTone(w.status)} /></td>
                      <td style={{fontSize:12,color:'var(--muted)',maxWidth:200}}>{w.reason?.slice(0,60)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="panel">
            <div className="panel-header"><div><h2>{selected.worker_name}</h2><p>{selected.worker_number}</p></div><StatusBadge label={selected.status} tone={getStatusTone(selected.status)} /></div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[['Type',selected.warning_type],['Date',formatDate(selected.issue_date)],['Issued by',selected.issued_by],['Reason',selected.reason],['Notes',selected.notes||'No follow-up note']].map(([label,value]) => (
                <div key={label} className="metric-row"><span className="label">{label}</span><span className="value" style={{maxWidth:200,textAlign:'right',fontSize:12}}>{value}</span></div>
              ))}
              <div style={{display:'flex',gap:6,marginTop:8}}>
                {selected.status === 'open' && <button className="btn btn-secondary btn-sm" onClick={async () => { await updateWarning(selected.id,{status:'monitoring'}); await reloadWarnings(); setSelected({...selected,status:'monitoring'}) }}>→ Monitoring</button>}
                {selected.status !== 'closed' && <button className="btn btn-ghost btn-sm" onClick={async () => { await updateWarning(selected.id,{status:'closed'}); await reloadWarnings(); setSelected({...selected,status:'closed'}) }}>Close record</button>}
              </div>
              <button className="btn btn-teal btn-sm" style={{marginTop:8}} onClick={async () => {
                const worker = workers.find(w => w.id === selected.worker_id)
                if (!worker) return
                const nextType = selected.level || nextWarningType(warnings, selected.worker_id)
                const ref = generateRefNumber(nextType)
                const today = new Date().toISOString().split('T')[0]
                const html = warningLetterHTML(worker, selected, ref, today, nextType, 'english')
                await addLetter({ ref_number: ref, letter_type: nextType, worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, language:'english', issued_date: today, issued_by:'HR Admin', linked_record_id: selected.id, status:'issued', notes:selected.reason || '' })
                setViewerHtml(html); setViewerRef(ref)
              }}>📄 Generate Warning Letter</button>
            </div>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Create Warning or Memo" onClose={() => { setShowDrawer(false); setFormErrors([]) }}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => { setShowDrawer(false); setFormErrors([]) }}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Create Record</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Worker</label><select className="form-select" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Type</label><select className="form-select" value={form.warning_type} onChange={e => setForm({...form,warning_type:e.target.value})}><option value="warning">Warning</option><option value="memo">Memo</option></select></div>
              <div className="form-field"><label className="form-label">Date</label><input className="form-input" type="date" value={form.issue_date} onChange={e => setForm({...form,issue_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Issued by</label><input className="form-input" value={form.issued_by} onChange={e => setForm({...form,issued_by:e.target.value})} placeholder="HR Admin / Site Manager" /></div>
              <div className="form-field"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option value="open">Open</option><option value="monitoring">Monitoring</option><option value="closed">Closed</option></select></div>
            </div>
            <div className="form-field"><label className="form-label">Reason *</label><textarea className="form-textarea" value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} rows={3} placeholder="Describe the incident or reason for the record" /></div>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Penalty amount (AED)</label><input className="form-input" type="number" step="0.01" value={form.penalty_amount} onChange={e => setForm({...form,penalty_amount:e.target.value})} placeholder="0.00 — leave blank for no penalty" /></div>
              <div className="form-field"><label className="form-label">Penalty type</label><select className="form-select" value={form.penalty_type} onChange={e => setForm({...form,penalty_type:e.target.value})}><option value="">No penalty</option><option value="deduction">One-off deduction</option><option value="advance_recovery">Advance recovery</option></select></div>
            </div>
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}

    </AppShell>
    {viewerHtml && <LetterViewer html={viewerHtml} refNumber={viewerRef} onClose={() => { setViewerHtml(null); setViewerRef('') }} />}
    </>
  )
}

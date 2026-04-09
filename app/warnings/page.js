'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getWarnings, addWarning, updateWarning, getWorkers, addPenaltyDeduction, makeId, getNextWarningType, generateRefNumber, addLetter, getWorker, getWorkerWarningLevel } from '../../lib/mockStore'
import { formatDate, getStatusTone, TODAY } from '../../lib/utils'
import { warningLetterHTML } from '../../lib/letterTemplates'
import LetterViewer from '../../components/LetterViewer'

export default function WarningsPage() {
  const [warnings, setWarnings] = useState([])
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const [form, setForm] = useState({ worker_id:'', warning_type:'warning', issue_date:'2026-04-08', reason:'', issued_by:'', status:'open', notes:'', penalty_amount:'', penalty_type:'' })
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')

  useEffect(() => { setWarnings(getWarnings()); setWorkers(getWorkers()) }, [])

  const filtered = filter === 'all' ? warnings : warnings.filter(w => w.status === filter)

  const handleAdd = () => {
    if (!form.reason || !form.reason.trim()) { setFormErrors(['Reason is required']); return }
    setFormErrors([])
    const worker = workers.find(w => w.id === form.worker_id)
    const newWarningId = makeId('wm')
    addWarning({ ...form, id: newWarningId, worker_name: worker?.full_name || '', worker_number: worker?.worker_number || '' })
    if (form.penalty_amount && form.penalty_type) {
      addPenaltyDeduction({
        id: makeId('pd'),
        warning_id: newWarningId,
        worker_id: form.worker_id,
        worker_name: worker?.full_name || '',
        worker_number: worker?.worker_number || '',
        label: `Warning penalty — ${form.reason?.slice(0,40)}`,
        amount: Number(form.penalty_amount),
        type: form.penalty_type,
        status: 'pending_hr_confirmation',
        created_at: TODAY
      })
    }
    setWarnings(getWarnings())
    setShowDrawer(false)
  }

  return (
    <>
    <AppShell pageTitle="Warnings">
      <PageHeader eyebrow="Warnings" title="Warnings and memos register" description="Track disciplinary records, memos, and follow-up status."
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
                    <tr key={w.id} style={{cursor:'pointer',background:selected?.id===w.id?'#f0fdfa':''}} onClick={() => setSelected(w)}>
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
                {selected.status === 'open' && <button className="btn btn-secondary btn-sm" onClick={() => { updateWarning(selected.id,{status:'monitoring'}); setWarnings(getWarnings()); setSelected({...selected,status:'monitoring'}) }}>→ Monitoring</button>}
                {selected.status !== 'closed' && <button className="btn btn-ghost btn-sm" onClick={() => { updateWarning(selected.id,{status:'closed'}); setWarnings(getWarnings()); setSelected({...selected,status:'closed'}) }}>Close record</button>}
              </div>
              <button className="btn btn-teal btn-sm" style={{marginTop:8}} onClick={() => {
                const worker = getWorker(selected.worker_id)
                if (!worker) return
                const nextType = getNextWarningType(selected.worker_id)
                const ref = generateRefNumber(nextType)
                const today = new Date().toISOString().split('T')[0]
                const html = warningLetterHTML(worker, selected, ref, today, nextType, 'english')
                addLetter({ id: makeId('let'), ref_number: ref, letter_type: nextType, worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, language:'english', issued_date: today, issued_by:'HR Admin', linked_record_id: selected.id, status:'issued', notes:'' })
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

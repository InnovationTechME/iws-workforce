'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getTimesheetHeaders, getTimesheetLines, addTimesheetHeader, addTimesheetLine, updateTimesheetHeader, getWorkers, makeId } from '../../lib/mockStore'
import { formatDate, getStatusTone } from '../../lib/utils'

export default function TimesheetsPage() {
  const [headers, setHeaders] = useState([])
  const [selected, setSelected] = useState(null)
  const [lines, setLines] = useState([])
  const [workers, setWorkers] = useState([])
  const [showHeaderDrawer, setShowHeaderDrawer] = useState(false)
  const [showLineDrawer, setShowLineDrawer] = useState(false)
  const [hForm, setHForm] = useState({ client_name:'', project_site:'', vessel_name:'', job_no:'', date:'', source_type:'manual' })
  const [lForm, setLForm] = useState({ worker_id:'', work_date:'', start_time:'07:00', end_time:'17:00', ot_hours:'0', holiday_hours:'0', remarks:'' })

  useEffect(() => {
    setHeaders(getTimesheetHeaders())
    setWorkers(getWorkers())
  }, [])

  useEffect(() => {
    if (selected) setLines(getTimesheetLines(selected.id))
  }, [selected])

  const pending = headers.filter(h => h.final_approval_status === 'pending' || h.final_approval_status === 'pending_owner').length

  const handleAddHeader = () => {
    addTimesheetHeader({ ...hForm, id: makeId('th'), hr_check_status:'pending', operations_check_status:'pending', final_approval_status:'pending', reconciliation_status:'pending' })
    setHeaders(getTimesheetHeaders())
    setShowHeaderDrawer(false)
  }

  const handleAddLine = () => {
    const worker = workers.find(w => w.id === lForm.worker_id)
    const isFlat = worker?.category === 'Contracted Hourly Worker' || worker?.category === 'Subcontractor'
    const start = lForm.start_time.split(':').map(Number)
    const end = lForm.end_time.split(':').map(Number)
    const total = (end[0]*60+end[1] - start[0]*60-start[1]) / 60
    const normal = Math.min(total, 8)
    const ot = isFlat ? 0 : (Number(lForm.ot_hours) || Math.max(total - 8, 0))
    addTimesheetLine({ ...lForm, id: makeId('tl'), header_id: selected.id, worker_name: worker?.full_name || '', worker_number: worker?.worker_number || '', trade_role: worker?.trade_role || '', category: worker?.category || '', total_hours: Math.round(total*100)/100, normal_hours: Math.round(normal*100)/100, ot_hours: ot, holiday_hours: isFlat ? 0 : Number(lForm.holiday_hours)||0 })
    setLines(getTimesheetLines(selected.id))
    setShowLineDrawer(false)
  }

  const handleApproval = (headerId, field, value) => {
    updateTimesheetHeader(headerId, { [field]: value })
    setHeaders(getTimesheetHeaders())
    if (selected?.id === headerId) setSelected(getTimesheetHeaders().find(h => h.id === headerId))
  }

  const toneMap = { checked:'success', approved:'success', matched:'success', pending:'danger', pending_owner:'warning', under_review:'warning', client_clarification:'warning', not_required:'neutral' }

  return (
    <AppShell pageTitle="Timesheets">
      <PageHeader eyebrow="Timesheets" title="Timesheet review queue" description="Review and approve timesheets through HR, Operations, and Owner sign-off."
        actions={<button className="btn btn-primary" onClick={() => setShowHeaderDrawer(true)}>+ Add Timesheet</button>} />

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${pending > 0 ? 'warning' : ''}`} style={{fontSize:20}}>{pending}</div><div className="lbl">Pending approval</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{headers.filter(h=>h.hr_check_status!=='checked').length}</div><div className="lbl">HR pending</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{headers.filter(h=>h.operations_check_status==='pending').length}</div><div className="lbl">Ops pending</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{headers.filter(h=>h.final_approval_status==='approved').length}</div><div className="lbl">Approved</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="panel">
          <div className="panel-header"><div><h2>Timesheet headers</h2></div><button className="btn btn-ghost btn-sm" onClick={() => setShowHeaderDrawer(true)}>+ Add</button></div>
          {headers.length === 0 ? <div className="empty-state"><h3>No timesheets yet</h3></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Client / site</th><th>Status</th></tr></thead>
                <tbody>
                  {headers.map(h => (
                    <tr key={h.id} style={{cursor:'pointer',background:selected?.id===h.id?'#eff6ff':''}} onClick={() => setSelected(h)}>
                      <td style={{fontSize:12}}>{formatDate(h.date)}<div style={{fontSize:11,color:'var(--hint)'}}>{h.job_no}</div></td>
                      <td style={{fontWeight:500}}>{h.client_name}<div style={{fontSize:11,color:'var(--hint)'}}>{h.project_site}</div></td>
                      <td><StatusBadge label={h.final_approval_status} tone={toneMap[h.final_approval_status]||'neutral'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="panel">
            <div className="panel-header">
              <div><h2>{selected.client_name}</h2><p>{selected.project_site} · {selected.job_no}</p></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLineDrawer(true)}>+ Line</button>
            </div>
            <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
              <StatusBadge label={`HR: ${selected.hr_check_status}`} tone={toneMap[selected.hr_check_status]||'neutral'} />
              <StatusBadge label={`Ops: ${selected.operations_check_status}`} tone={toneMap[selected.operations_check_status]||'neutral'} />
              <StatusBadge label={`Final: ${selected.final_approval_status}`} tone={toneMap[selected.final_approval_status]||'neutral'} />
            </div>
            <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
              {selected.hr_check_status === 'pending' && <button className="btn btn-teal btn-sm" onClick={() => handleApproval(selected.id,'hr_check_status','checked')}>✓ HR Check</button>}
              {selected.operations_check_status === 'pending' && <button className="btn btn-teal btn-sm" onClick={() => handleApproval(selected.id,'operations_check_status','checked')}>✓ Ops Check</button>}
              {selected.final_approval_status === 'pending' || selected.final_approval_status === 'pending_owner' ? <button className="btn btn-primary btn-sm" onClick={() => handleApproval(selected.id,'final_approval_status','approved')}>✓ Final Approve</button> : null}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Worker</th><th>Total</th><th>Normal</th><th>OT</th><th>Holiday</th></tr></thead>
                <tbody>
                  {lines.length === 0 ? <tr><td colSpan={5} style={{textAlign:'center',color:'var(--hint)',padding:24}}>No lines yet</td></tr> : lines.map(l => (
                    <tr key={l.id}>
                      <td style={{fontWeight:500}}>{l.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{l.worker_number}</div></td>
                      <td>{l.total_hours}h</td><td>{l.normal_hours}h</td><td>{l.ot_hours}h</td><td>{l.holiday_hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showHeaderDrawer && (
        <DrawerForm title="Add Timesheet Header" onClose={() => setShowHeaderDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowHeaderDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddHeader}>Add</button></div>}>
          <div className="form-grid">
            <div className="form-field"><label className="form-label">Client name</label><input className="form-input" value={hForm.client_name} onChange={e => setHForm({...hForm,client_name:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Project site</label><input className="form-input" value={hForm.project_site} onChange={e => setHForm({...hForm,project_site:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Job number</label><input className="form-input" value={hForm.job_no} onChange={e => setHForm({...hForm,job_no:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Date</label><input className="form-input" type="date" value={hForm.date} onChange={e => setHForm({...hForm,date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Vessel name</label><input className="form-input" value={hForm.vessel_name} onChange={e => setHForm({...hForm,vessel_name:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Source type</label><select className="form-select" value={hForm.source_type} onChange={e => setHForm({...hForm,source_type:e.target.value})}><option value="manual">Manual</option><option value="excel">Excel</option><option value="pdf">PDF</option></select></div>
          </div>
        </DrawerForm>
      )}

      {showLineDrawer && selected && (
        <DrawerForm title="Add Timesheet Line" onClose={() => setShowLineDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowLineDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddLine}>Add Line</button></div>}>
          <div className="form-grid">
            <div className="form-field"><label className="form-label">Worker</label><select className="form-select" value={lForm.worker_id} onChange={e => setLForm({...lForm,worker_id:e.target.value})}><option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name} ({w.worker_number}){w.category==='Subcontractor'?' [SUB]':''}</option>)}</select></div>
            <div className="form-field"><label className="form-label">Work date</label><input className="form-input" type="date" value={lForm.work_date} onChange={e => setLForm({...lForm,work_date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Start time</label><input className="form-input" type="time" value={lForm.start_time} onChange={e => setLForm({...lForm,start_time:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">End time</label><input className="form-input" type="time" value={lForm.end_time} onChange={e => setLForm({...lForm,end_time:e.target.value})} /></div>
            {(() => { const sw = workers.find(w=>w.id===lForm.worker_id); const flat = sw?.category==='Contracted Hourly Worker'||sw?.category==='Subcontractor'; return flat ? (
              <div className="notice info" style={{fontSize:12,gridColumn:'span 2'}}>ℹ Contracted hourly / subcontractor — flat rate only. All hours billed at AED {sw?.hourly_rate}/hr. No OT premium applied.</div>
            ) : (<>
              <div className="form-field"><label className="form-label">OT hours override</label><input className="form-input" type="number" step="0.5" value={lForm.ot_hours} onChange={e => setLForm({...lForm,ot_hours:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Holiday hours</label><input className="form-input" type="number" step="0.5" value={lForm.holiday_hours} onChange={e => setLForm({...lForm,holiday_hours:e.target.value})} /></div>
            </>) })()}
            <div className="form-field span-2"><label className="form-label">Remarks</label><input className="form-input" value={lForm.remarks} onChange={e => setLForm({...lForm,remarks:e.target.value})} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

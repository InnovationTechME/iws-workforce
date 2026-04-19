'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import {
  initiateOffboarding,
  tickOffboardingItem, canCloseOffboarding, closeOffboarding,
  OFFBOARDING_ITEMS
} from '../../lib/mockStore'
import { supabase } from '../../lib/supabaseClient'
import { getRole } from '../../lib/mockAuth'
import { formatDate, formatCurrency } from '../../lib/utils'
import { calculateFinalSettlement } from '../../lib/finalSettlement'

export default function OffboardingExitPage() {
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [selected, setSelected] = useState(null)
  const [showInitiate, setShowInitiate] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closeResult, setCloseResult] = useState(null)
  const [form, setForm] = useState({ worker_id:'', reason:'Resignation', last_working_date:'' })
  const [role, setRoleState] = useState('owner')
  const [finalSettlement, setFinalSettlement] = useState(null)
  const [terminationType, setTerminationType] = useState('resignation')
  const [noticeServedDays, setNoticeServedDays] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: activeWorkers } = await supabase
        .from('workers')
        .select('id, full_name, worker_number, category')
        .eq('status', 'active')
        .order('worker_number')
      setWorkers(activeWorkers || [])
      setRecords(getOffboarding())
      setRoleState(getRole())
    }
    load()
  }, [])

  const refresh = () => {
    setRecords(getOffboarding())
    if (selected) setSelected(getOffboarding().find(o => o.id === selected.id))
  }

  const handleInitiate = () => {
    if (!form.worker_id || !form.last_working_date) return
    initiateOffboarding(form.worker_id, form.reason, form.last_working_date, role === 'owner' ? 'Management' : 'HR Admin')
    refresh()
    setShowInitiate(false)
    setForm({ worker_id:'', reason:'Resignation', last_working_date:'' })
  }

  const handleTick = (item_key) => {
    tickOffboardingItem(selected.id, item_key, role === 'owner' ? 'Management' : 'HR Admin')
    refresh()
  }

  const handleTryClose = () => {
    const result = canCloseOffboarding(selected.id)
    setCloseResult(result)
    setShowCloseConfirm(true)
  }

  const handleConfirmClose = () => {
    const result = closeOffboarding(selected.id, role === 'owner' ? 'Management' : 'HR Admin')
    if (result.success) { refresh(); setSelected(null) }
    setShowCloseConfirm(false)
  }

  const inProgress = records.filter(r => r.status === 'in_progress')
  const closed = records.filter(r => r.status === 'closed')
  const reasonOptions = ['Resignation','Contract End','Termination','Redundancy','Medical','Absconding','Other']

  return (
    <AppShell pageTitle="Offboarding">
      <PageHeader eyebrow="Worker Exit" title="Worker exit &amp; offboarding"
        description="Complete all exit checklist items before a worker file can be closed. Prevents double-payment and ensures compliance."
        actions={<button className="btn btn-danger" onClick={() => setShowInitiate(true)}>+ Initiate Offboarding</button>} />

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${inProgress.length>0?'warning':''}`} style={{fontSize:20}}>{inProgress.length}</div><div className="lbl">In progress</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:20}}>{closed.length}</div><div className="lbl">Closed</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:20}}>{inProgress.reduce((s,r)=>s+OFFBOARDING_ITEMS.filter(i=>i.required&&!r.checklist[i.key]?.done).length,0)}</div><div className="lbl">Outstanding items</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{OFFBOARDING_ITEMS.filter(i=>i.required).length}</div><div className="lbl">Required steps</div></div>
      </div>

      {inProgress.length > 0 && (
        <div style={{background:'#fff7ed',border:'1.5px solid #fed7aa',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,color:'#9a3412',fontWeight:500}}>
          ⚠ {inProgress.length} worker{inProgress.length>1?'s are':' is'} in active offboarding. Worker files cannot be closed until all required checklist items are ticked.
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="panel">
          <div className="panel-header"><div><h2>Offboarding records</h2></div></div>
          {records.length === 0 ? <div className="empty-state"><h3>No offboarding records</h3><p>Initiate offboarding when a worker leaves.</p></div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Worker</th><th>Reason</th><th>Last day</th><th>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {records.map(r => {
                  const total = OFFBOARDING_ITEMS.filter(i=>i.required).length
                  const done = OFFBOARDING_ITEMS.filter(i=>i.required&&r.checklist[i.key]?.done).length
                  const pct = Math.round((done/total)*100)
                  return (
                    <tr key={r.id} style={{cursor:'pointer',background:selected?.id===r.id?'#eff6ff':''}} onClick={()=>setSelected(r)}>
                      <td style={{fontWeight:500}}>{r.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{r.worker_number}</div></td>
                      <td style={{fontSize:12}}>{r.reason}</td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(r.last_working_date)}</td>
                      <td><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{flex:1,height:4,background:'var(--border)',borderRadius:2}}><div style={{width:`${pct}%`,height:'100%',background:pct===100?'var(--success)':'var(--warning)',borderRadius:2}}/></div><span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>{done}/{total}</span></div></td>
                      <td><StatusBadge label={r.status} tone={r.status==='closed'?'success':'warning'}/></td>
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
              <div><h2>{selected.worker_name}</h2><p>{selected.worker_number} · {selected.reason} · Last day: {formatDate(selected.last_working_date)}</p></div>
              <StatusBadge label={selected.status} tone={selected.status==='closed'?'success':'warning'}/>
            </div>
            {/* Final Settlement Calculator */}
            <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:12}}>Final Settlement Calculation</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
                <div className="form-field"><label className="form-label">Termination type</label><select className="form-select" value={terminationType} onChange={e=>setTerminationType(e.target.value)}><option value="resignation">Resignation (60 days)</option><option value="with_notice">Company (30 days)</option><option value="without_notice">Without notice (Art. 44)</option></select></div>
                <div className="form-field"><label className="form-label">Notice days served</label><input className="form-input" type="number" min="0" value={noticeServedDays} onChange={e=>setNoticeServedDays(parseInt(e.target.value)||0)} /></div>
                <div style={{display:'flex',alignItems:'flex-end'}}><button className="btn btn-teal" onClick={() => { const s = calculateFinalSettlement(selected.worker_id, selected.last_working_date, terminationType, noticeServedDays); setFinalSettlement(s) }}>Calculate Settlement</button></div>
              </div>
              {finalSettlement && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid var(--border)',padding:16}}>
                  {[['End of Service Gratuity', finalSettlement.breakdown.eos_gratuity.amount, finalSettlement.breakdown.eos_gratuity.calculation],
                    ['Unused Annual Leave ('+finalSettlement.breakdown.unused_leave.days+' days)', finalSettlement.breakdown.unused_leave.amount, ''],
                    ['Outstanding Salary ('+finalSettlement.breakdown.outstanding_salary.days+' days)', finalSettlement.breakdown.outstanding_salary.total, ''],
                    ...(finalSettlement.breakdown.air_ticket.due ? [['Air Ticket ('+finalSettlement.breakdown.air_ticket.count+')', finalSettlement.breakdown.air_ticket.amount, '']] : []),
                  ].map(([label, amount, note]) => (
                    <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                      <div><div style={{fontSize:13,fontWeight:500}}>{label}</div>{note && <div style={{fontSize:11,color:'var(--muted)'}}>{note}</div>}</div>
                      <div style={{fontSize:15,fontWeight:600}}>{formatCurrency(amount)}</div>
                    </div>
                  ))}
                  {finalSettlement.breakdown.notice_period.is_deduction && (
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9',background:'#fef2f2',margin:'0 -16px',padding:'8px 16px'}}>
                      <div><div style={{fontSize:13,fontWeight:600,color:'var(--danger)'}}>Notice Period DEDUCTION</div><div style={{fontSize:11,color:'var(--danger)'}}>{finalSettlement.breakdown.notice_period.note}</div></div>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--danger)'}}>-{formatCurrency(finalSettlement.breakdown.notice_period.amount)}</div>
                    </div>
                  )}
                  {!finalSettlement.breakdown.notice_period.is_deduction && finalSettlement.breakdown.notice_period.required_days > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                      <div><div style={{fontSize:13,fontWeight:500,color:'var(--success)'}}>Notice Period (Fully Served)</div><div style={{fontSize:11,color:'var(--muted)'}}>{finalSettlement.breakdown.notice_period.note}</div></div>
                      <div style={{fontSize:13,color:'var(--success)'}}>✓ No deduction</div>
                    </div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',marginTop:8,borderTop:'2px solid var(--border)'}}>
                    <div style={{fontSize:13,fontWeight:600}}>Gross Settlement</div>
                    <div style={{fontSize:16,fontWeight:700}}>{formatCurrency(finalSettlement.summary.gross_settlement)}</div>
                  </div>
                  {finalSettlement.summary.total_deductions > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--danger)'}}>Total Deductions</div>
                      <div style={{fontSize:16,fontWeight:700,color:'var(--danger)'}}>-{formatCurrency(finalSettlement.summary.total_deductions)}</div>
                    </div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',background:'#eff6ff',borderRadius:8,marginTop:8}}>
                    <div style={{fontSize:15,fontWeight:800}}>NET FINAL SETTLEMENT</div>
                    <div style={{fontSize:22,fontWeight:800,color:'var(--teal)'}}>{formatCurrency(finalSettlement.summary.net_settlement)}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>Exit Checklist</div>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {OFFBOARDING_ITEMS.map(item => {
                const state = selected.checklist[item.key]
                const isDone = state?.done
                return (
                  <div key={item.key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)',opacity:selected.status==='closed'?0.7:1}}>
                    <div style={{width:22,height:22,borderRadius:4,border:`2px solid ${isDone?'var(--success)':'var(--border)'}`,background:isDone?'var(--success)':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:selected.status!=='closed'&&!isDone?'pointer':'default'}}
                      onClick={()=>{ if(!isDone && selected.status!=='closed') handleTick(item.key) }}>
                      {isDone && <span style={{color:'white',fontSize:13,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:isDone?400:500,color:isDone?'var(--muted)':'var(--text)',textDecoration:isDone?'line-through':'none'}}>{item.label}</div>
                      {isDone && <div style={{fontSize:10,color:'var(--hint)'}}>✓ {state.done_by} · {formatDate(state.done_at)}</div>}
                    </div>
                    {item.required
                      ? <span style={{fontSize:9,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'2px 6px',borderRadius:10}}>REQUIRED</span>
                      : <span style={{fontSize:9,color:'var(--hint)',background:'var(--surface)',padding:'2px 6px',borderRadius:10}}>optional</span>
                    }
                  </div>
                )
              })}
            </div>
            {selected.status !== 'closed' && (
              <div style={{marginTop:16}}>
                <button className="btn btn-danger" style={{width:'100%'}} onClick={handleTryClose}>Close Worker File</button>
                {(() => {
                  const {can, missing} = canCloseOffboarding(selected.id)
                  if (!can) return <div style={{fontSize:11,color:'#dc2626',marginTop:8,lineHeight:1.6}}>⛔ Cannot close — {missing.length} required item{missing.length>1?'s':''} outstanding</div>
                  return <div style={{fontSize:11,color:'var(--success)',marginTop:8}}>✓ All required items complete — ready to close</div>
                })()}
              </div>
            )}
            {selected.notes && <div style={{marginTop:12,fontSize:12,color:'var(--muted)',background:'var(--surface)',padding:'8px 12px',borderRadius:6}}>{selected.notes}</div>}
          </div>
        )}
      </div>

      {showInitiate && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:999,display:'flex',justifyContent:'flex-end'}}>
          <div style={{width:420,background:'white',height:'100%',padding:24,overflowY:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:16,fontWeight:700}}>Initiate Offboarding</h2>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowInitiate(false)}>✕</button>
            </div>
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:6,padding:'10px 12px',marginBottom:16,fontSize:12,color:'#9a3412'}}>
              ⚠ Once initiated, the worker file cannot be closed until all required exit checklist items are completed.
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="form-field"><label className="form-label">Worker *</label><select className="form-select" value={form.worker_id} onChange={e=>setForm({...form,worker_id:e.target.value})}><option value="">Select active worker</option>{workers.filter(w=>w.active!==false).map(w=><option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>)}</select></div>
              <div className="form-field"><label className="form-label">Reason *</label><select className="form-select" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}>{reasonOptions.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Last working date *</label><input className="form-input" type="date" value={form.last_working_date} onChange={e=>setForm({...form,last_working_date:e.target.value})} /></div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}>
              <button className="btn btn-secondary" onClick={()=>setShowInitiate(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleInitiate}>Initiate Offboarding</button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && closeResult && (
        closeResult.can
          ? <ConfirmDialog title="Close worker file?" message="All required checklist items are complete. This will mark the worker as inactive and close their file. This action cannot be undone." confirmLabel="Close File" confirmTone="btn-danger" onConfirm={handleConfirmClose} onCancel={()=>setShowCloseConfirm(false)} />
          : <ConfirmDialog title="Cannot close file" message={`${closeResult.missing.length} required item${closeResult.missing.length>1?'s are':' is'} not yet complete. All required items must be ticked before the file can be closed.`} confirmLabel="OK" confirmTone="btn-secondary" onConfirm={()=>setShowCloseConfirm(false)} onCancel={()=>setShowCloseConfirm(false)} />
      )}
    </AppShell>
  )
}

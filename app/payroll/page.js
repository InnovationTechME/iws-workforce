'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getAllPayrollBatches, getPayrollBatchByMonth, getPayrollLinesByBatch, canEditPayrollBatch, unlockPayrollBatch, addCorrectionNote, getPayrollBatch, getPayrollLines, updatePayrollBatch, addPayrollAdjustment, getPenaltyDeductions, confirmPenaltyDeduction, removePenaltyDeduction, getRamadanMode, getWorkers } from '../../lib/mockStore'
import { formatCurrency, getStatusTone } from '../../lib/utils'
import { canAccess, getRole } from '../../lib/mockAuth'

export default function PayrollPage() {
  const [allBatches, setAllBatches] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [batch, setBatch] = useState(null)
  const [lines, setLines] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('all')
  const [adjForm, setAdjForm] = useState({ type:'allowance', label:'', amount:'' })
  const [penalties, setPenalties] = useState([])
  const [officeStaff, setOfficeStaff] = useState([])
  const [role, setRoleState] = useState('owner')
  const [canEdit, setCanEdit] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionNote, setCorrectionNote] = useState('')

  useEffect(() => {
    setRoleState(getRole())
    const batches = getAllPayrollBatches()
    setAllBatches(batches)
    if (batches.length > 0) {
      setSelectedMonth(batches[0].month)
      loadBatch(batches[0].month)
    }
    setPenalties(getPenaltyDeductions())
    setOfficeStaff(getWorkers().filter(w => w.category === 'Office Staff' && w.active !== false))
  }, [])

  const loadBatch = (month) => {
    const b = getPayrollBatchByMonth(month)
    setBatch(b)
    if (b) {
      setLines(getPayrollLinesByBatch(b.id))
      setCanEdit(canEditPayrollBatch(b.id))
    }
  }

  const handleMonthChange = (month) => {
    setSelectedMonth(month)
    loadBatch(month)
    setSelected(null)
  }

  const handleUnlock = () => {
    if (!unlockReason.trim()) return
    unlockPayrollBatch(batch.id, 'Owner', unlockReason)
    setShowUnlock(false); setUnlockReason('')
    setAllBatches(getAllPayrollBatches()); loadBatch(selectedMonth)
  }

  const handleAddCorrection = () => {
    if (!correctionNote.trim()) return
    addCorrectionNote(batch.id, correctionNote, role === 'owner' ? 'Owner' : 'HR Admin')
    setShowCorrection(false); setCorrectionNote('')
    loadBatch(selectedMonth)
  }

  if (!canAccess('payroll')) return <AppShell pageTitle="Payroll"><div className="page-shell"><div className="panel"><div className="empty-state"><h3>Access restricted</h3></div></div></div></AppShell>
  if (!batch) return null

  const filtered = tab === 'all' ? lines : lines.filter(l => {
    const w = { 'direct':'Direct Employee','hourly':'Contracted Hourly Worker','sub':'Subcontractor','office':'Office Staff' }[tab]
    return l.category === w
  })

  const gross = lines.reduce((s,l) => s + l.gross_pay, 0)
  const net = lines.reduce((s,l) => s + l.net_pay, 0)
  const deductions = lines.reduce((s,l) => s + l.deductions_total + l.advances_total, 0)
  const ramadanActive = getRamadanMode()?.active
  const wpsTotals = {
    wps: lines.filter(l => !l.payment_method || l.payment_method === 'WPS').reduce((s,l) => s + l.net_pay, 0),
    nonWps: lines.filter(l => l.payment_method === 'Non-WPS').reduce((s,l) => s + l.net_pay, 0),
    cash: lines.filter(l => l.payment_method === 'Cash').reduce((s,l) => s + l.net_pay, 0),
  }

  const handleAddAdj = () => {
    if (!selected || !adjForm.label || !adjForm.amount || !canEdit) return
    addPayrollAdjustment({ batch_id: batch.id, worker_id: selected.worker_id, adjustment_type: adjForm.type, label: adjForm.label, amount: Number(adjForm.amount) })
    setAdjForm({ type:'allowance', label:'', amount:'' })
  }

  return (
    <AppShell pageTitle="Payroll">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <p className="eyebrow">Payroll</p>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>{batch.month_label}</h1>
          <p style={{fontSize:12,color:'var(--muted)',marginTop:3}}>Review payroll lines before distribution</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="filter-select" value={selectedMonth||''} onChange={e => handleMonthChange(e.target.value)} style={{minWidth:200}}>
            {allBatches.map(b => <option key={b.id} value={b.month}>{b.month_label}{b.locked ? ' 🔒' : ''}{b.status === 'draft' ? ' (Draft)' : ''}</option>)}
          </select>
          <StatusBadge label={batch.locked ? '🔒 Locked' : batch.status} tone={batch.locked ? 'danger' : batch.status === 'ready_for_review' ? 'warning' : 'neutral'} />
        </div>
      </div>

      {/* Lock Banner */}
      {batch.locked && (
        <div style={{background:'#fef2f2',border:'2px solid #fca5a5',borderRadius:12,padding:'20px 24px',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
              <div style={{fontSize:42}}>🔒</div>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:'#dc2626'}}>PAYROLL LOCKED</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Locked on {batch.locked_at ? new Date(batch.locked_at).toLocaleDateString('en-GB') : '—'} by {batch.locked_by}</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:6}}>This payroll cannot be edited. Corrections must be made in the following month.</div>
              </div>
            </div>
            {role === 'owner' && (
              <div style={{display:'flex',gap:8,flexShrink:0}}>
                <button className="btn btn-secondary" onClick={() => setShowCorrection(true)}>Add Correction Note</button>
                <button className="btn btn-danger" onClick={() => setShowUnlock(true)}>🔓 Unlock (Owner Only)</button>
              </div>
            )}
          </div>
          {batch.correction_notes?.length > 0 && (
            <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid #fca5a5'}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:8}}>Correction Notes:</div>
              {batch.correction_notes.map((n, i) => (
                <div key={i} style={{background:'#fff',border:'1px solid #fca5a5',borderRadius:6,padding:'8px 12px',marginBottom:4}}>
                  <div style={{fontSize:12}}>{n.note}</div>
                  <div style={{fontSize:10,color:'var(--hint)',marginTop:4}}>Added by {n.added_by} on {new Date(n.added_at).toLocaleDateString('en-GB')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ramadanActive && <div style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,fontWeight:500}}>🌙 Ramadan Mode Active — OT threshold: 6hrs</div>}

      <div className="summary-strip">
        <div className="stat-card"><div className="num teal" style={{fontSize:18}}>{formatCurrency(gross)}</div><div className="lbl">Gross payroll</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:18}}>{formatCurrency(deductions)}</div><div className="lbl">Deductions + advances</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:18}}>{formatCurrency(net)}</div><div className="lbl">Net payroll</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{lines.length}</div><div className="lbl">Workers on batch</div></div>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['WPS (Endered)', wpsTotals.wps, '🏦'],['Non-WPS (Cash/Transfer)', wpsTotals.nonWps, '💵'],['Cash (Pending C3)', wpsTotals.cash, '⚠']].map(([label, amount, icon]) => (
          <div key={label} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 16px'}}>
            <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:4}}>{icon} {label}</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--teal)'}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
        ))}
      </div>

      {/* Office Staff */}
      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-header"><div><h2>Office staff — monthly salary</h2><p>Exempt from timesheets. Salary runs automatically.</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Worker ID</th><th>Basic salary</th><th>Housing</th><th>Transport</th><th>Total package</th><th>Payment</th></tr></thead>
          <tbody>{officeStaff.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--hint)',padding:16}}>No office staff</td></tr> : officeStaff.map(w => {
            const total = (w.monthly_salary||0)+(w.housing_allowance||0)+(w.transport_allowance||0)+(w.food_allowance||0)
            return (<tr key={w.id}><td style={{fontWeight:500}}>{w.full_name}<div style={{fontSize:11,color:'var(--hint)'}}>{w.trade_role}</div></td><td style={{fontFamily:'monospace',fontSize:12}}>{w.worker_number}</td><td>AED {(w.monthly_salary||0).toLocaleString()}</td><td style={{fontSize:12,color:'var(--muted)'}}>{w.housing_allowance>0?'AED '+w.housing_allowance:'—'}</td><td style={{fontSize:12,color:'var(--muted)'}}>{w.transport_allowance>0?'AED '+w.transport_allowance:'—'}</td><td style={{fontWeight:700,color:'var(--teal)'}}>AED {total.toLocaleString()}</td><td><StatusBadge label={w.payment_method||'WPS'} tone={w.payment_method==='WPS'?'success':'warning'} /></td></tr>)
          })}</tbody>
        </table></div>
      </div>

      {/* Main payroll table */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
        <div className="panel">
          <div className="tabs">
            {[['all','All'],['direct','Direct'],['hourly','Hourly'],['sub','Sub'],['office','Office']].map(([key,label]) => (
              <button key={key} className={`tab${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Worker</th><th>Type</th><th>Payment</th><th>Normal pay</th><th>OT pay</th><th>Allowances</th><th>Deductions</th><th>Net pay</th><th>C3</th></tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{cursor:'pointer',background:selected?.id===l.id?'#f0fdfa':''}} onClick={() => setSelected(l)}>
                  <td style={{fontWeight:500}}>{l.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{l.worker_number}</div></td>
                  <td><StatusBadge label={l.payroll_type} tone="neutral" /></td>
                  <td><StatusBadge label={l.payment_method||'WPS'} tone={l.payment_method==='Non-WPS'?'warning':l.payment_method==='Cash'?'danger':'success'} /></td>
                  <td style={{fontSize:12}}>{formatCurrency(l.normal_pay)}</td>
                  <td style={{fontSize:12}}>{formatCurrency(l.ot_pay)}</td>
                  <td style={{fontSize:12,color:'var(--success)'}}>{formatCurrency(l.allowances_total)}</td>
                  <td style={{fontSize:12,color:'var(--danger)'}}>{formatCurrency(l.deductions_total + l.advances_total)}</td>
                  <td style={{fontSize:13,fontWeight:600,color:'var(--teal)'}}>{formatCurrency(l.net_pay)}</td>
                  <td><StatusBadge label={l.c3_status?.slice(0,12)} tone={l.c3_status?.includes('Not') ? 'neutral' : l.c3_status?.includes('Blocked') ? 'danger' : 'warning'} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        {selected && (
          <div className="panel">
            <div className="panel-header"><div><h2>{selected.worker_name}</h2><p>{selected.worker_number} · {selected.category}</p></div></div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {[['Rate / salary', selected.payroll_type === 'monthly' ? formatCurrency(selected.rate_or_salary) + '/mo' : formatCurrency(selected.rate_or_salary) + '/hr'],['Normal hours',selected.normal_hours+'h'],['OT hours',selected.ot_hours+'h'],['Holiday hours',selected.holiday_hours+'h'],['Normal pay',formatCurrency(selected.normal_pay)],['OT pay',formatCurrency(selected.ot_pay)],['Holiday pay',formatCurrency(selected.holiday_ot_pay)],['Allowances',formatCurrency(selected.allowances_total)],['Deductions',formatCurrency(selected.deductions_total)],['Advances',formatCurrency(selected.advances_total)]].map(([label,value]) => (
                <div key={label} className="metric-row"><span className="label">{label}</span><span className="value" style={{fontSize:12}}>{value}</span></div>
              ))}
              <div className="metric-row" style={{borderTop:'1.5px solid var(--border)',paddingTop:10}}>
                <span style={{fontWeight:600,fontSize:13}}>Net pay</span>
                <span style={{fontWeight:700,fontSize:15,color:'var(--teal)'}}>{formatCurrency(selected.net_pay)}</span>
              </div>
            </div>
            {canEdit && <>
              <div style={{fontSize:12,fontWeight:500,marginBottom:8,color:'var(--muted)'}}>Add adjustment</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <select className="form-select" style={{fontSize:12}} value={adjForm.type} onChange={e => setAdjForm({...adjForm,type:e.target.value})}><option value="allowance">Allowance</option><option value="deduction">Deduction</option><option value="advance">Advance</option></select>
                <input className="form-input" style={{fontSize:12}} placeholder="Label" value={adjForm.label} onChange={e => setAdjForm({...adjForm,label:e.target.value})} />
                <input className="form-input" style={{fontSize:12}} placeholder="Amount (AED)" type="number" value={adjForm.amount} onChange={e => setAdjForm({...adjForm,amount:e.target.value})} />
                <button className="btn btn-teal btn-sm" onClick={handleAddAdj}>Add adjustment</button>
              </div>
            </>}
            {!canEdit && <div style={{fontSize:12,color:'var(--hint)',padding:'8px 0',fontStyle:'italic'}}>🔒 Payroll locked — adjustments not allowed</div>}
            {penalties.filter(p => p.worker_id === selected?.worker_id).length > 0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,fontWeight:500,color:'var(--muted)',marginBottom:8}}>WARNING PENALTIES</div>
                {penalties.filter(p => p.worker_id === selected.worker_id).map(p => (
                  <div key={p.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:500}}>{p.label}</div>
                    <div style={{fontSize:12,color:'var(--danger)',fontWeight:600}}>AED {p.amount.toFixed(2)}</div>
                    <div style={{fontSize:11,color:'var(--hint)',marginBottom:6}}>{p.status === 'pending_hr_confirmation' ? '⏳ Awaiting HR confirmation' : '✓ Confirmed'}</div>
                    {canEdit && <div style={{display:'flex',gap:6}}>
                      {p.status === 'pending_hr_confirmation' && <button className="btn btn-teal btn-sm" onClick={() => { confirmPenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()) }}>Confirm</button>}
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => { removePenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()) }}>Remove</button>
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!canEdit && batch.locked && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'12px 16px',marginTop:16,fontSize:12,color:'#92400e'}}>
          <strong>Note:</strong> This payroll is locked. To correct errors, add a correction note and adjust in the following month&apos;s payroll.
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlock && (
        <div className="drawer-backdrop" onClick={() => setShowUnlock(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:24,width:'min(420px,90vw)',margin:'auto',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>🔓 Unlock Payroll — Owner Authorization</h3>
            <div className="notice warning" style={{marginBottom:12,fontSize:12}}>Unlocking will reset all approvals. Operations and Owner must re-approve after modifications.</div>
            <label className="form-label">Reason for unlocking *</label>
            <textarea className="form-textarea" value={unlockReason} onChange={e => setUnlockReason(e.target.value)} placeholder="Explain why this payroll needs to be unlocked..." rows={4} />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-secondary" onClick={() => { setShowUnlock(false); setUnlockReason('') }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleUnlock}>Confirm Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Note Modal */}
      {showCorrection && (
        <div className="drawer-backdrop" onClick={() => setShowCorrection(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:24,width:'min(420px,90vw)',margin:'auto',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>Add Correction Note</h3>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Document errors for reference when processing next month&apos;s payroll.</p>
            <label className="form-label">Correction note *</label>
            <textarea className="form-textarea" value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} placeholder="Describe the issue and how it will be corrected..." rows={4} />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-secondary" onClick={() => { setShowCorrection(false); setCorrectionNote('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCorrection}>Add Note</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

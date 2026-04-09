'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getPayrollBatch, getPayrollLines, updatePayrollBatch, getPayrollLine, addPayrollAdjustment, updatePayrollLine, getPenaltyDeductions, confirmPenaltyDeduction, removePenaltyDeduction, getRamadanMode } from '../../lib/mockStore'
import { formatCurrency, getStatusTone } from '../../lib/utils'
import { canAccess } from '../../lib/mockAuth'

export default function PayrollPage() {
  const [batch, setBatch] = useState(null)
  const [lines, setLines] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('all')
  const [adjForm, setAdjForm] = useState({ type:'allowance', label:'', amount:'' })
  const [penalties, setPenalties] = useState([])

  useEffect(() => {
    setBatch(getPayrollBatch())
    setLines(getPayrollLines())
    setPenalties(getPenaltyDeductions())
  }, [])

  if (!canAccess('payroll')) return <AppShell pageTitle="Payroll"><div className="page-shell"><div className="panel"><div className="empty-state"><h3>Access restricted</h3><p>Payroll is not available for your role.</p></div></div></div></AppShell>

  if (!batch) return null

  const filtered = tab === 'all' ? lines : lines.filter(l => {
    const w = { 'direct': 'Direct Employee', 'hourly': 'Contracted Hourly Worker', 'sub': 'Subcontractor', 'office': 'Office Staff' }[tab]
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

  const handleStatusUpdate = (status) => {
    updatePayrollBatch({ status })
    setBatch(getPayrollBatch())
  }

  const handleAddAdj = () => {
    if (!selected || !adjForm.label || !adjForm.amount) return
    addPayrollAdjustment({ batch_id: batch.id, worker_id: selected.worker_id, adjustment_type: adjForm.type, label: adjForm.label, amount: Number(adjForm.amount) })
    setAdjForm({ type:'allowance', label:'', amount:'' })
  }

  return (
    <AppShell pageTitle="Payroll">
      <PageHeader eyebrow="Payroll" title="Payroll batch review" description={`${batch.month_label} — review payroll lines before C3 handoff.`}
        actions={
          <div style={{display:'flex',gap:8}}>
            <select className="filter-select" value={batch.status} onChange={e => handleStatusUpdate(e.target.value)}>
              <option value="Ready for review">Ready for review</option>
              <option value="Internal approval">Internal approval</option>
              <option value="Ready for C3">Ready for C3</option>
              <option value="Needs clarification">Needs clarification</option>
            </select>
            <StatusBadge label={batch.distribution_status} tone="neutral" />
          </div>
        } />

      <div className="summary-strip">
        <div className="stat-card"><div className="num teal" style={{fontSize:18}}>{formatCurrency(gross)}</div><div className="lbl">Gross payroll</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:18}}>{formatCurrency(deductions)}</div><div className="lbl">Deductions + advances</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:18}}>{formatCurrency(net)}</div><div className="lbl">Net payroll</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{lines.length}</div><div className="lbl">Workers on batch</div></div>
      </div>

      {ramadanActive && (
        <div style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,fontWeight:500}}>
          🌙 Ramadan Mode Active — OT threshold: 6hrs · Minimum attendance: 5hrs
        </div>
      )}

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['WPS (Endered)', wpsTotals.wps, '🏦'],['Non-WPS (Cash/Transfer)', wpsTotals.nonWps, '💵'],['Cash (Pending C3)', wpsTotals.cash, '⚠']].map(([label, amount, icon]) => (
          <div key={label} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 16px'}}>
            <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:4}}>{icon} {label}</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--teal)'}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
        <div className="panel">
          <div className="tabs">
            {[['all','All'],['direct','Direct Employees'],['hourly','Hourly Workers'],['sub','Subcontractors'],['office','Office Staff']].map(([key,label]) => (
              <button key={key} className={`tab${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          <div className="table-wrap">
            <table>
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
            </table>
          </div>
        </div>

        {selected && (
          <div className="panel">
            <div className="panel-header"><div><h2>{selected.worker_name}</h2><p>{selected.worker_number} · {selected.category}</p></div></div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {[['Rate / salary', selected.payroll_type === 'monthly' ? formatCurrency(selected.rate_or_salary) + '/mo' : formatCurrency(selected.rate_or_salary) + '/hr'],['Normal hours',`${selected.normal_hours}h`],['OT hours',`${selected.ot_hours}h`],['Holiday hours',`${selected.holiday_hours}h`],['Normal pay',formatCurrency(selected.normal_pay)],['OT pay',formatCurrency(selected.ot_pay)],['Holiday pay',formatCurrency(selected.holiday_ot_pay)],['Allowances',formatCurrency(selected.allowances_total)],['Deductions',formatCurrency(selected.deductions_total)],['Advances',formatCurrency(selected.advances_total)]].map(([label,value]) => (
                <div key={label} className="metric-row"><span className="label">{label}</span><span className="value" style={{fontSize:12}}>{value}</span></div>
              ))}
              <div className="metric-row" style={{borderTop:'1.5px solid var(--border)',paddingTop:10}}>
                <span style={{fontWeight:600,fontSize:13}}>Net pay</span>
                <span style={{fontWeight:700,fontSize:15,color:'var(--teal)'}}>{formatCurrency(selected.net_pay)}</span>
              </div>
            </div>
            {selected.policy_note && <div className="notice info" style={{fontSize:11,marginBottom:12}}>{selected.policy_note}</div>}
            <div style={{fontSize:12,fontWeight:500,marginBottom:8,color:'var(--muted)'}}>Add adjustment</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <select className="form-select" style={{fontSize:12}} value={adjForm.type} onChange={e => setAdjForm({...adjForm,type:e.target.value})}><option value="allowance">Allowance</option><option value="deduction">Deduction</option><option value="advance">Advance</option></select>
              <input className="form-input" style={{fontSize:12}} placeholder="Label" value={adjForm.label} onChange={e => setAdjForm({...adjForm,label:e.target.value})} />
              <input className="form-input" style={{fontSize:12}} placeholder="Amount (AED)" type="number" value={adjForm.amount} onChange={e => setAdjForm({...adjForm,amount:e.target.value})} />
              <button className="btn btn-teal btn-sm" onClick={handleAddAdj}>Add adjustment</button>
            </div>
            {penalties.filter(p => p.worker_id === selected?.worker_id).length > 0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,fontWeight:500,color:'var(--muted)',marginBottom:8}}>WARNING PENALTIES</div>
                {penalties.filter(p => p.worker_id === selected.worker_id).map(p => (
                  <div key={p.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:500}}>{p.label}</div>
                    <div style={{fontSize:12,color:'var(--danger)',fontWeight:600}}>AED {p.amount.toFixed(2)}</div>
                    <div style={{fontSize:11,color:'var(--hint)',marginBottom:6}}>{p.status === 'pending_hr_confirmation' ? '⏳ Awaiting HR confirmation' : '✓ Confirmed'}</div>
                    <div style={{display:'flex',gap:6}}>
                      {p.status === 'pending_hr_confirmation' && (
                        <button className="btn btn-teal btn-sm" onClick={() => { confirmPenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()) }}>Confirm</button>
                      )}
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => { removePenaltyDeduction(p.id); setPenalties(getPenaltyDeductions()) }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

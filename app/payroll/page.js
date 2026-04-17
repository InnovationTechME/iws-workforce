'use client'
import React, { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import {
  getPayrollBatches, getPayrollLines, getPayrollBatchById,
  getAdjustmentsByBatch
} from '../../lib/payrollService'
import { getVisibleWorkers } from '../../lib/workerService'
import { formatCurrency, getStatusTone } from '../../lib/utils'
import { canAccess, getRole } from '../../lib/mockAuth'

export default function PayrollPage() {
  const [allBatches, setAllBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [batch, setBatch] = useState(null)
  const [lines, setLines] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('all')
  const [officeStaff, setOfficeStaff] = useState([])
  const [role, setRoleState] = useState('owner')
  const [loading, setLoading] = useState(true)
  const [workers, setWorkers] = useState([])
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        setRoleState(getRole())
        const [batches, ws] = await Promise.all([
          getPayrollBatches(),
          getVisibleWorkers()
        ])
        setAllBatches(batches)
        setWorkers(ws)
        setOfficeStaff(ws.filter(w => w.category === 'Office Staff' && w.status === 'active'))
        if (batches.length > 0) {
          setSelectedBatchId(batches[0].id)
          await loadBatch(batches[0].id)
        }
      } catch (err) {
        console.error('Payroll init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadBatch = async (batchId) => {
    try {
      const [b, l] = await Promise.all([
        getPayrollBatchById(batchId),
        getPayrollLines(batchId)
      ])
      setBatch(b)
      setLines(l)
    } catch (err) {
      console.error('loadBatch error:', err)
    }
  }

  const handleBatchChange = async (batchId) => {
    setSelectedBatchId(batchId)
    setSelected(null)
    await loadBatch(batchId)
  }

  if (!canAccess('payroll')) return <AppShell pageTitle="Payroll"><div className="page-shell"><div className="panel"><div className="empty-state"><h3>Access restricted</h3></div></div></div></AppShell>
  if (loading) return <AppShell pageTitle="Payroll"><div style={{padding:40,textAlign:'center'}}>Loading...</div></AppShell>
  if (!batch) return <AppShell pageTitle="Payroll"><div className="page-shell"><div className="panel" style={{textAlign:'center',padding:40}}>
    <div style={{fontSize:48,marginBottom:12}}>💰</div>
    <h3>No payroll batches yet</h3>
    <p style={{color:'var(--muted)',marginBottom:16}}>Generate your first payroll batch from the Payroll Run page.</p>
    <a href="/payroll-run" className="btn btn-primary">Go to Payroll Run →</a>
  </div></div></AppShell>

  const filtered = tab === 'all' ? lines : lines.filter(l => {
    const w = l.worker || {}
    const catMap = { 'direct':'Permanent Staff','hourly':'Contract Worker','sub':'Subcontract Worker','office':'Office Staff' }
    return w.category === catMap[tab]
  })

  const gross = lines.reduce((s,l) => s + Number(l.gross_pay || 0), 0)
  const net = lines.reduce((s,l) => s + Number(l.net_pay || 0), 0)
  const deductions = lines.reduce((s,l) => s + Number(l.deductions_total || 0), 0)
  const wpsTotals = {
    wps: lines.filter(l => !l.payment_method || l.payment_method === 'WPS').reduce((s,l) => s + Number(l.net_pay || 0), 0),
    nonWps: lines.filter(l => l.payment_method === 'Non-WPS').reduce((s,l) => s + Number(l.net_pay || 0), 0),
    cash: lines.filter(l => l.payment_method === 'Cash').reduce((s,l) => s + Number(l.net_pay || 0), 0),
  }

  return (
    <AppShell pageTitle="Payroll">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <p className="eyebrow">Payroll</p>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>{batch.month_label}</h1>
          <p style={{fontSize:12,color:'var(--muted)',marginTop:3}}>Review payroll lines — data from Supabase</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="filter-select" value={selectedBatchId||''} onChange={e => handleBatchChange(e.target.value)} style={{minWidth:200}}>
            {allBatches.map(b => <option key={b.id} value={b.id}>{b.month_label}{b.status === 'locked' ? ' 🔒' : ''}{b.status === 'draft' ? ' (Draft)' : ''}</option>)}
          </select>
          <StatusBadge label={batch.status === 'locked' ? '🔒 Locked' : batch.status} tone={batch.status === 'locked' ? 'danger' : batch.status === 'calculated' ? 'warning' : 'neutral'} />
        </div>
      </div>

      {/* Lock Banner */}
      {batch.status === 'locked' && (
        <div style={{background:'#fef2f2',border:'2px solid #fca5a5',borderRadius:12,padding:'20px 24px',marginBottom:20}}>
          <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
            <div style={{fontSize:42}}>🔒</div>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:'#dc2626'}}>PAYROLL LOCKED</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Locked on {batch.locked_at ? new Date(batch.locked_at).toLocaleDateString('en-GB') : '—'} by {batch.locked_by}</div>
              <div style={{fontSize:12,color:'#64748b',marginTop:6}}>This payroll cannot be edited. Corrections must be made in the following month.</div>
            </div>
          </div>
        </div>
      )}

      <div className="summary-strip">
        <div className="stat-card"><div className="num teal" style={{fontSize:18}}>{formatCurrency(gross)}</div><div className="lbl">Gross payroll</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:18}}>{formatCurrency(deductions)}</div><div className="lbl">Deductions</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:18}}>{formatCurrency(net)}</div><div className="lbl">Net payroll</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{lines.length}</div><div className="lbl">Workers on batch</div></div>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[['WPS (Endered)', wpsTotals.wps, '🏦'],['Non-WPS (C3 Card)', wpsTotals.nonWps, '💵'],['Cash (Pending C3)', wpsTotals.cash, '⚠']].map(([label, amount, icon]) => (
          <div key={label} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 16px'}}>
            <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:4}}>{icon} {label}</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--teal)'}}>AED {amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
        ))}
      </div>

      {/* WhatsApp Numbers Panel */}
      <div style={{marginBottom:16}}>
        <button className="btn btn-ghost btn-sm" style={{fontSize:12}} onClick={() => setShowWhatsApp(!showWhatsApp)}>{showWhatsApp ? '▲' : '▼'} WhatsApp Numbers</button>
        {showWhatsApp && (
          <div className="panel" style={{marginTop:8}}>
            <div className="table-wrap"><table>
              <thead><tr><th>Worker</th><th>WhatsApp</th></tr></thead>
              <tbody>{lines.map(l => {
                const w = workers.find(wk => wk.id === l.worker_id) || l.worker || {}
                return (<tr key={l.id}><td style={{fontWeight:500,fontSize:12}}>{l.worker_name || w.full_name}<div style={{fontSize:10,color:'var(--hint)'}}>{l.worker_number || w.worker_number}</div></td><td style={{fontSize:12,fontFamily:'monospace'}}>{w.whatsapp_number || <span style={{color:'var(--hint)'}}>Not set</span>}</td></tr>)
              })}</tbody>
            </table></div>
          </div>
        )}
      </div>

      {/* Office Staff */}
      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-header"><div><h2>Office staff — monthly salary</h2><p>Exempt from timesheets. Salary runs automatically.</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Worker ID</th><th>Basic salary</th><th>Housing</th><th>Transport</th><th>Total package</th><th>Payment</th></tr></thead>
          <tbody>{officeStaff.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--hint)',padding:16}}>No office staff</td></tr> : officeStaff.map(w => {
            const total = Number(w.monthly_salary||0)+Number(w.housing_allowance||0)+Number(w.transport_allowance||0)+Number(w.food_allowance||0)
            return (<tr key={w.id}><td style={{fontWeight:500}}>{w.full_name}<div style={{fontSize:11,color:'var(--hint)'}}>{w.trade_role}</div></td><td style={{fontFamily:'monospace',fontSize:12}}>{w.worker_number}</td><td>AED {Number(w.monthly_salary||0).toLocaleString()}</td><td style={{fontSize:12,color:'var(--muted)'}}>{Number(w.housing_allowance)>0?'AED '+w.housing_allowance:'—'}</td><td style={{fontSize:12,color:'var(--muted)'}}>{Number(w.transport_allowance)>0?'AED '+w.transport_allowance:'—'}</td><td style={{fontWeight:700,color:'var(--teal)'}}>AED {total.toLocaleString()}</td><td><StatusBadge label={w.payment_method||'WPS'} tone={w.payment_method==='WPS'?'success':'warning'} /></td></tr>)
          })}</tbody>
        </table></div>
      </div>

      {/* Main payroll table */}
      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 340px':'1fr',gap:16}}>
        <div className="panel">
          <div className="tabs">
            {[['all','All'],['direct','Direct'],['hourly','Hourly'],['sub','Sub'],['office','Office']].map(([key,label]) => (
              <button key={key} className={`tab${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Worker</th><th>Type</th><th>Payment</th><th style={{textAlign:'right'}}>Rate / Salary</th><th style={{textAlign:'right'}}>Hours</th><th style={{textAlign:'right'}}>OT Pay</th><th style={{textAlign:'right'}}>Allowances</th><th style={{textAlign:'right'}}>Gross</th><th style={{textAlign:'right'}}>Net pay</th></tr></thead>
            <tbody>
              {filtered.map(l => {
                const w = l.worker || {}
                const isHourly = l.payroll_type === 'hourly'
                return (
                <tr key={l.id} style={{cursor:'pointer',background:selected?.id===l.id?'#eff6ff':''}} onClick={() => setSelected(l)}>
                  <td style={{fontWeight:500}}>{l.worker_name || w.full_name}<div style={{fontSize:11,color:'var(--hint)'}}>{l.worker_number || w.worker_number}</div></td>
                  <td><StatusBadge label={l.payroll_type || 'monthly'} tone="neutral" /></td>
                  <td><StatusBadge label={l.payment_method||'WPS'} tone={l.payment_method==='Non-WPS'?'warning':l.payment_method==='Cash'?'danger':'success'} /></td>
                  <td style={{textAlign:'right',fontSize:12}}>{isHourly ? `AED ${l.rate_used || l.base_hourly_rate}/hr` : formatCurrency(l.basic_salary)}</td>
                  <td style={{textAlign:'right',fontSize:12}}>{l.total_hours ? `${l.total_hours}h` : '—'}</td>
                  <td style={{textAlign:'right',fontSize:12,color:'var(--success)'}}>{Number(l.ot1_pay||0)+Number(l.ot2_pay||0)>0 ? formatCurrency(Number(l.ot1_pay||0)+Number(l.ot2_pay||0)) : '—'}</td>
                  <td style={{textAlign:'right',fontSize:12,color:'var(--success)'}}>{Number(l.allowances_total||0)>0 ? formatCurrency(l.allowances_total) : '—'}</td>
                  <td style={{textAlign:'right',fontSize:12}}>{formatCurrency(l.gross_pay)}</td>
                  <td style={{textAlign:'right',fontSize:13,fontWeight:600,color:'var(--teal)'}}>{formatCurrency(l.net_pay)}</td>
                </tr>)
              })}
            </tbody>
          </table></div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="panel" style={{alignSelf:'start',position:'sticky',top:80}}>
            <div className="panel-header">
              <div>
                <h2>{selected.worker_name || selected.worker?.full_name}</h2>
                <p style={{fontFamily:'monospace'}}>{selected.worker_number || selected.worker?.worker_number}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--teal)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Earnings</div>
              {selected.payroll_type === 'hourly' ? (<>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hourly Rate</span><span>AED {selected.rate_used || selected.base_hourly_rate}/hr</span></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Hours Worked</span><span>{selected.total_hours}h</span></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Standard Pay</span><span>{formatCurrency(selected.basic_salary)}</span></div>
                {Number(selected.ot2_pay||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'var(--danger)'}}><span>Holiday Premium ({selected.ot2_hours}h)</span><span>{formatCurrency(selected.ot2_pay)}</span></div>}
              </>) : (<>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Basic Salary</span><span style={{fontWeight:600}}>{formatCurrency(selected.basic_salary)}</span></div>
                {Number(selected.allowances_total||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'var(--success)'}}><span>Allowances</span><span>{formatCurrency(selected.allowances_total)}</span></div>}
                {Number(selected.ot1_pay||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'var(--warning)'}}><span>OT Weekday ({selected.ot1_hours}h)</span><span>{formatCurrency(selected.ot1_pay)}</span></div>}
                {Number(selected.ot2_pay||0)>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'var(--danger)'}}><span>OT Fri/Holiday ({selected.ot2_hours}h)</span><span>{formatCurrency(selected.ot2_pay)}</span></div>}
              </>)}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,borderTop:'1px solid var(--border)',paddingTop:8,marginTop:8}}><span>Gross</span><span style={{color:'var(--teal)'}}>{formatCurrency(selected.gross_pay)}</span></div>

              {Number(selected.deductions_total||0)>0 && (<>
                <div style={{fontSize:11,fontWeight:700,color:'var(--danger)',textTransform:'uppercase',letterSpacing:1,marginTop:16,marginBottom:10}}>Deductions</div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:'var(--danger)'}}><span>Total Deductions</span><span>-{formatCurrency(selected.deductions_total)}</span></div>
              </>)}

              <div style={{background:'#0f172a',color:'white',borderRadius:8,padding:'12px 14px',marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:13,fontWeight:700}}>NET PAY</span>
                <span style={{fontSize:16,fontWeight:800,color:'#5eead4'}}>{formatCurrency(selected.net_pay)}</span>
              </div>

              <div style={{marginTop:12,fontSize:11,color:'var(--hint)'}}>
                <div>Category: {selected.worker?.category || '—'}</div>
                <div>Payment: {selected.payment_method || 'WPS'}</div>
                <div>Payroll type: {selected.payroll_type || 'monthly'}</div>
                {selected.ramadan_mode && <div style={{color:'#7c3aed',fontWeight:600}}>🌙 Ramadan mode</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

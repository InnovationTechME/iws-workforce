'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getWorkers, addWorkerWithC3Task, makeId } from '../../lib/mockStore'
import { formatCurrency, getStatusTone } from '../../lib/utils'

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ full_name:'', trade_role:'', category:'Permanent Staff', nationality:'', passport_number:'', mobile_number:'', email:'', payroll_type:'monthly', monthly_salary:'', hourly_rate:'', fixed_allowance:'', project_site:'', visa_company:'Innovation Technologies', subcontractor_company:'', subcontractor_billing_rate:'', subcontractor_cost_rate:'' })

  useEffect(() => { setWorkers(getWorkers()) }, [])

  const filtered = workers.filter(w => {
    const q = search.toLowerCase()
    const matchSearch = !search || w.full_name.toLowerCase().includes(q) || w.worker_number?.toLowerCase().includes(q) || w.trade_role?.toLowerCase().includes(q)
    const matchCat = categoryFilter === 'all' || w.category === categoryFilter
    const matchStatus = statusFilter === 'all' || w.status === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  const handleAdd = () => {
    const seq = String(workers.length + 1).padStart(4, '0')
    const worker = { ...form, id: makeId('w'), worker_number: `IWS-2026-${seq}`, status: 'Pre-employment', active: false, onboarding_status: 'Pre-employment', joining_date: null, leaving_date: null, blacklisted: false, monthly_salary: Number(form.monthly_salary)||0, hourly_rate: Number(form.hourly_rate)||0, fixed_allowance: Number(form.fixed_allowance)||0, subcontractor_billing_rate: Number(form.subcontractor_billing_rate)||0, subcontractor_cost_rate: Number(form.subcontractor_cost_rate)||0, ot_eligible: true, holiday_ot_eligible: true, leave_eligible: true }
    addWorkerWithC3Task(worker)
    setWorkers(getWorkers())
    setShowDrawer(false)
    setForm({ full_name:'', trade_role:'', category:'Permanent Staff', nationality:'', passport_number:'', mobile_number:'', email:'', payroll_type:'monthly', monthly_salary:'', hourly_rate:'', fixed_allowance:'', project_site:'', visa_company:'Innovation Technologies', subcontractor_company:'', subcontractor_billing_rate:'', subcontractor_cost_rate:'' })
  }

  const categories = ['Permanent Staff', 'Contract Worker', 'Subcontract Worker', 'Office Staff']
  const statuses = ['Active', 'On Leave', 'Pre-employment', 'Inactive']

  return (
    <AppShell pageTitle="Workers">
      <PageHeader eyebrow="Workers" title="Worker register" description="All workers — direct employees, contracted hourly, subcontractors, and office staff."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Add Worker</button>} />

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:10,marginBottom:4}}>
        {[['All',workers.length],['Permanent Staff',workers.filter(w=>w.category==='Permanent Staff').length],['Contract',workers.filter(w=>w.category==='Contract Worker').length],['Subcontract Worker',workers.filter(w=>w.category==='Subcontract Worker').length],['Office Staff',workers.filter(w=>w.category==='Office Staff').length]].map(([label,count]) => (
          <div key={label} className="stat-card" style={{cursor:'pointer'}} onClick={() => setCategoryFilter(label === 'All' ? 'all' : label === 'Contract' ? 'Contract Worker' : label)}>
            <div className="num" style={{fontSize:20}}>{count}</div>
            <div className="lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          <input className="search-input" placeholder="Search name, number, or role..." value={search} onChange={e => setSearch(e.target.value)} style={{flex:1}} />
          <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No workers found</h3><p>Try adjusting your search or filters.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Role</th><th>Category</th><th>Payroll</th><th>Site</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:32,height:32,borderRadius:'50%',background:'var(--teal-bg)',border:'1px solid var(--teal-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:'var(--teal)',flexShrink:0}}>{w.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div><div><div style={{fontWeight:500}}>{w.full_name}</div><div style={{fontSize:11,color:'var(--hint)'}}>{w.worker_number}</div></div></div></td>
                    <td>{w.trade_role}</td>
                    <td>
                      <StatusBadge label={w.category} tone={w.category === 'Subcontract Worker' ? 'neutral' : w.category === 'Office Staff' ? 'info' : 'neutral'} />
                      {w.category === 'Subcontract Worker' && w.subcontractor_company && <div style={{fontSize:11,color:'var(--hint)',marginTop:2}}>{w.subcontractor_company}</div>}
                    </td>
                    <td>
                      <div style={{fontSize:12}}>{w.payroll_type === 'monthly' ? formatCurrency(w.monthly_salary) + '/mo' : formatCurrency(w.hourly_rate) + '/hr'}</div>
                      {w.category === 'Subcontract Worker' && w.subcontractor_billing_rate && <div style={{fontSize:11,color:'var(--hint)'}}>Bill: {formatCurrency(w.subcontractor_billing_rate)}/hr</div>}
                    </td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{w.project_site}</td>
                    <td><StatusBadge label={w.status} tone={getStatusTone(w.status)} /></td>
                    <td><Link href={`/workers/${w.id}`} className="btn btn-secondary btn-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Add Worker" subtitle="Create a new worker record" onClose={() => setShowDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add Worker</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Full name *</label><input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} placeholder="Full name" /></div>
              <div className="form-field"><label className="form-label">Trade / role *</label><input className="form-input" value={form.trade_role} onChange={e => setForm({...form, trade_role:e.target.value})} placeholder="Welder, Foreman, etc." /></div>
              <div className="form-field"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Nationality</label><input className="form-input" value={form.nationality} onChange={e => setForm({...form, nationality:e.target.value})} placeholder="Indian, Pakistani, etc." /></div>
              <div className="form-field"><label className="form-label">Passport number</label><input className="form-input" value={form.passport_number} onChange={e => setForm({...form, passport_number:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Mobile</label><input className="form-input" value={form.mobile_number} onChange={e => setForm({...form, mobile_number:e.target.value})} placeholder="+971..." /></div>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm({...form, email:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Project site</label><input className="form-input" value={form.project_site} onChange={e => setForm({...form, project_site:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Payroll type</label><select className="form-select" value={form.payroll_type} onChange={e => setForm({...form, payroll_type:e.target.value})}><option value="monthly">Monthly salary</option><option value="hourly">Hourly rate</option></select></div>
              {form.payroll_type === 'monthly' ? <div className="form-field"><label className="form-label">Monthly salary (AED)</label><input className="form-input" type="number" value={form.monthly_salary} onChange={e => setForm({...form, monthly_salary:e.target.value})} /></div> : <div className="form-field"><label className="form-label">Hourly rate (AED)</label><input className="form-input" type="number" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate:e.target.value})} /></div>}
              <div className="form-field"><label className="form-label">Fixed allowance (AED)</label><input className="form-input" type="number" value={form.fixed_allowance} onChange={e => setForm({...form, fixed_allowance:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Visa company</label><input className="form-input" value={form.visa_company} onChange={e => setForm({...form, visa_company:e.target.value})} /></div>
            </div>
            {form.category === 'Subcontract Worker' && (
              <div style={{padding:'12px',background:'var(--surface)',borderRadius:8,border:'0.5px solid var(--border)'}}>
                <div style={{fontSize:12,fontWeight:500,marginBottom:10,color:'var(--muted)'}}>Subcontractor details</div>
                <div className="form-grid">
                  <div className="form-field"><label className="form-label">Subcontractor company</label><input className="form-input" value={form.subcontractor_company} onChange={e => setForm({...form, subcontractor_company:e.target.value})} /></div>
                  <div className="form-field"><label className="form-label">Billing rate (AED/hr)</label><input className="form-input" type="number" value={form.subcontractor_billing_rate} onChange={e => setForm({...form, subcontractor_billing_rate:e.target.value})} /></div>
                  <div className="form-field"><label className="form-label">Cost rate (AED/hr)</label><input className="form-input" type="number" value={form.subcontractor_cost_rate} onChange={e => setForm({...form, subcontractor_cost_rate:e.target.value})} /></div>
                </div>
              </div>
            )}
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

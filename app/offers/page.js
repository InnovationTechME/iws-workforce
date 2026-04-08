'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getOffers, addOffer, updateOffer, checkBlacklist, makeId } from '../../lib/mockStore'
import { formatCurrency, formatDate, getStatusTone, calculateOTRates } from '../../lib/utils'

export default function OffersPage() {
  const [offers, setOffers] = useState([])
  const [filter, setFilter] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [blacklistWarning, setBlacklistWarning] = useState(null)
  const [form, setForm] = useState({ candidate_name:'', candidate_email:'', passport_number:'', nationality:'', position:'', category:'Direct Employee', employment_type:'open-ended', salary_type:'monthly', salary_monthly:'', hourly_rate:'', fixed_allowance:'', start_date:'', validity_date:'', subcontractor_company:'', subcontractor_billing_rate:'', subcontractor_cost_rate:'', notes:'' })

  useEffect(() => { setOffers(getOffers()) }, [])

  const filtered = filter === 'all' ? offers : offers.filter(o => o.offer_status === filter)

  const otRates = form.salary_type === 'monthly' && form.salary_monthly
    ? calculateOTRates(Number(form.salary_monthly), 'monthly')
    : form.salary_type === 'hourly' && form.hourly_rate
    ? calculateOTRates(Number(form.hourly_rate), 'hourly')
    : null

  const handlePassportCheck = (passport) => {
    setForm({...form, passport_number: passport})
    if (passport.length > 5) {
      const match = checkBlacklist(passport)
      setBlacklistWarning(match)
    } else {
      setBlacklistWarning(null)
    }
  }

  const [formErrors, setFormErrors] = useState([])

  const handleCreate = () => {
    const errors = []
    if (!form.candidate_name?.trim()) errors.push('Candidate name is required')
    if (!form.position?.trim()) errors.push('Position is required')
    if (!form.nationality?.trim()) errors.push('Nationality is required')
    if (form.salary_type === 'monthly' && !form.salary_monthly) errors.push('Monthly salary is required')
    if (form.salary_type === 'hourly' && !form.hourly_rate) errors.push('Hourly rate is required')
    if (!form.start_date) errors.push('Start date is required')
    if (errors.length > 0) { setFormErrors(errors); return }
    setFormErrors([])
    const rates = otRates || { ot125: 0, ot150: 0 }
    const offer = { ...form, id: makeId('off'), offer_status: 'draft', salary_monthly: Number(form.salary_monthly)||0, hourly_rate: Number(form.hourly_rate)||0, fixed_allowance: Number(form.fixed_allowance)||0, ot_rate_125: rates.ot125, ot_rate_150: rates.ot150, subcontractor_billing_rate: Number(form.subcontractor_billing_rate)||0, subcontractor_cost_rate: Number(form.subcontractor_cost_rate)||0, offer_pdf_url: null, signed_offer_url: null, worker_id: null, created_at: '2026-04-08' }
    addOffer(offer)
    setOffers(getOffers())
    setShowDrawer(false)
  }

  const handleStatusChange = (id, status) => {
    updateOffer(id, { offer_status: status })
    setOffers(getOffers())
  }

  const statusColors = { draft:'neutral', sent:'info', signed:'success', rescinded:'danger' }

  return (
    <AppShell pageTitle="Offers">
      <PageHeader eyebrow="Offers" title="Offer register" description="Create and track offer letters from draft through to signed acceptance."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Create Offer Letter</button>} />

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[['All',offers.length,'neutral'],['Draft',offers.filter(o=>o.offer_status==='draft').length,'neutral'],['Sent',offers.filter(o=>o.offer_status==='sent').length,'info'],['Signed',offers.filter(o=>o.offer_status==='signed').length,'success']].map(([label,count,tone]) => (
          <div key={label} className="stat-card" style={{cursor:'pointer'}} onClick={() => setFilter(label.toLowerCase())}>
            <div className={`num ${tone !== 'neutral' ? tone : ''}`} style={{fontSize:20}}>{count}</div>
            <div className="lbl">{label} offers</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All offers</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="rescinded">Rescinded</option>
          </select>
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No offers yet</h3><p>Create your first offer letter to get started.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Candidate</th><th>Position</th><th>Category</th><th>Compensation</th><th>Valid until</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td><div style={{fontWeight:500}}>{o.candidate_name}</div><div style={{fontSize:11,color:'var(--hint)'}}>{o.nationality}</div></td>
                    <td>{o.position}</td>
                    <td><StatusBadge label={o.category} tone="neutral" /></td>
                    <td><div style={{fontSize:12}}>{o.salary_type === 'monthly' ? formatCurrency(o.salary_monthly) + '/mo' : formatCurrency(o.hourly_rate) + '/hr'}</div>
                      {o.category === 'Subcontractor' && <div style={{fontSize:11,color:'var(--hint)'}}>Bill: {formatCurrency(o.subcontractor_billing_rate)}/hr</div>}
                    </td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(o.validity_date)}</td>
                    <td><StatusBadge label={o.offer_status} tone={statusColors[o.offer_status]||'neutral'} /></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        {o.offer_status === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(o.id,'sent')}>Mark Sent</button>}
                        {o.offer_status === 'sent' && <button className="btn btn-teal btn-sm" onClick={() => handleStatusChange(o.id,'signed')}>Mark Signed</button>}
                        {o.offer_status === 'sent' && <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(o.id,'rescinded')}>Rescind</button>}
                        {o.offer_status === 'signed' && <Link href={`/onboarding`} className="btn btn-teal btn-sm">→ Onboarding</Link>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Create Offer Letter" subtitle="Draft a new offer for a candidate" onClose={() => setShowDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={!!blacklistWarning}>Create Offer</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            {blacklistWarning && <div className="notice danger"><strong>Blacklist match:</strong> {blacklistWarning.full_name} — {blacklistWarning.reason}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Candidate name *</label><input className="form-input" value={form.candidate_name} onChange={e => setForm({...form, candidate_name:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Passport number</label><input className="form-input" value={form.passport_number} onChange={e => handlePassportCheck(e.target.value)} placeholder="Auto-checks blacklist" /></div>
              <div className="form-field"><label className="form-label">Nationality</label><input className="form-input" value={form.nationality} onChange={e => setForm({...form, nationality:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={form.candidate_email} onChange={e => setForm({...form, candidate_email:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Position *</label><input className="form-input" value={form.position} onChange={e => setForm({...form, position:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{['Direct Employee','Contracted Hourly Worker','Subcontractor','Office Staff'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Employment type</label><select className="form-select" value={form.employment_type} onChange={e => setForm({...form, employment_type:e.target.value})}><option value="open-ended">Open-ended</option><option value="fixed-term">Fixed-term</option></select></div>
              <div className="form-field"><label className="form-label">Salary type</label><select className="form-select" value={form.salary_type} onChange={e => setForm({...form, salary_type:e.target.value})}><option value="monthly">Monthly salary</option><option value="hourly">Hourly rate</option></select></div>
              {form.salary_type === 'monthly' ? <div className="form-field"><label className="form-label">Monthly salary (AED)</label><input className="form-input" type="number" value={form.salary_monthly} onChange={e => setForm({...form, salary_monthly:e.target.value})} /></div> : <div className="form-field"><label className="form-label">Hourly rate (AED)</label><input className="form-input" type="number" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate:e.target.value})} /></div>}
              <div className="form-field"><label className="form-label">Fixed allowance (AED)</label><input className="form-input" type="number" value={form.fixed_allowance} onChange={e => setForm({...form, fixed_allowance:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Start date</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Valid until</label><input className="form-input" type="date" value={form.validity_date} onChange={e => setForm({...form, validity_date:e.target.value})} /></div>
            </div>
            {otRates && <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px',border:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:500,color:'var(--muted)',marginBottom:8}}>OT RATES (AUTO-CALCULATED)</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>Hourly equiv.</div><div style={{fontSize:13,fontWeight:500}}>AED {otRates.hourlyEquiv}/hr</div></div>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>OT 1.25x</div><div style={{fontSize:13,fontWeight:500}}>AED {otRates.ot125}/hr</div></div>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>OT 1.50x</div><div style={{fontSize:13,fontWeight:500}}>AED {otRates.ot150}/hr</div></div>
              </div>
            </div>}
            {form.category === 'Subcontractor' && <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px',border:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:500,color:'var(--muted)',marginBottom:8}}>SUBCONTRACTOR DETAILS</div>
              <div className="form-grid">
                <div className="form-field"><label className="form-label">Company name</label><input className="form-input" value={form.subcontractor_company} onChange={e => setForm({...form, subcontractor_company:e.target.value})} /></div>
                <div className="form-field"><label className="form-label">Billing rate (AED/hr)</label><input className="form-input" type="number" value={form.subcontractor_billing_rate} onChange={e => setForm({...form, subcontractor_billing_rate:e.target.value})} /></div>
                <div className="form-field"><label className="form-label">Cost rate (AED/hr)</label><input className="form-input" type="number" value={form.subcontractor_cost_rate} onChange={e => setForm({...form, subcontractor_cost_rate:e.target.value})} /></div>
              </div>
            </div>}
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}

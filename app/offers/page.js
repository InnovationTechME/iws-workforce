'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getOffers, addOffer, updateOffer, checkBlacklist, makeId, generateRefNumber, addLetter } from '../../lib/mockStore'
import { formatCurrency, formatDate, getStatusTone, calculateOTRates } from '../../lib/utils'
import { NATIONALITIES, POSITIONS } from '../../data/constants'
import { offerLetterHTML } from '../../lib/letterTemplates'
import LetterViewer from '../../components/LetterViewer'

export default function OffersPage() {
  const [offers, setOffers] = useState([])
  const [filter, setFilter] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [blacklistWarning, setBlacklistWarning] = useState(null)
  const [formErrors, setFormErrors] = useState([])
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')
  const [form, setForm] = useState({ first_name:'', last_name:'', passport_number:'', nationality:'', email:'', trade_role:'', category:'Permanent Staff', employment_type:'Open-ended', pay_type:'monthly', basic_salary_or_rate:'', housing_allowance:'', transport_allowance:'', food_allowance:'', other_allowance:'', start_date:'', valid_until:'', notes:'' })

  useEffect(() => { setOffers(getOffers()) }, [])

  const filtered = filter === 'all' ? offers : offers.filter(o => o.offer_status === filter)

  const basicAmt = Number(form.basic_salary_or_rate) || 0
  const totalPackage = basicAmt + (Number(form.housing_allowance)||0) + (Number(form.transport_allowance)||0) + (Number(form.food_allowance)||0) + (Number(form.other_allowance)||0)
  const otRates = form.pay_type === 'monthly' && basicAmt ? calculateOTRates(basicAmt, 'monthly') : form.pay_type === 'hourly' && basicAmt ? calculateOTRates(basicAmt, 'hourly') : null

  const handlePassportCheck = (passport) => {
    setForm({...form, passport_number: passport})
    if (passport.length > 5) {
      setBlacklistWarning(checkBlacklist(passport))
    } else {
      setBlacklistWarning(null)
    }
  }

  const handleCreate = () => {
    const errors = []
    if (!form.first_name?.trim()) errors.push('First name is required')
    if (!form.last_name?.trim()) errors.push('Last name is required')
    if (!form.passport_number?.trim()) errors.push('Passport number is required')
    if (!form.nationality) errors.push('Nationality is required')
    if (!form.trade_role) errors.push('Position / trade is required')
    if (!basicAmt) errors.push(form.pay_type === 'monthly' ? 'Basic salary is required' : 'Hourly rate is required')
    if (!form.start_date) errors.push('Start date is required')
    if (errors.length > 0) { setFormErrors(errors); return }
    setFormErrors([])
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`
    const rates = otRates || { ot125: 0, ot150: 0 }
    const offer = {
      ...form, id: makeId('off'), offer_status: 'draft', candidate_name: fullName,
      salary_monthly: form.pay_type === 'monthly' ? basicAmt : 0,
      hourly_rate: form.pay_type === 'hourly' ? basicAmt : 0,
      position: form.trade_role,
      fixed_allowance: totalPackage - basicAmt,
      ot_rate_125: rates.ot125, ot_rate_150: rates.ot150,
      offer_pdf_url: null, signed_offer_url: null, worker_id: null, created_at: '2026-04-08',
      salary_type: form.pay_type, nationality: form.nationality
    }
    addOffer(offer)
    setOffers(getOffers())
    setShowDrawer(false)
  }

  const handleStatusChange = (id, status) => { updateOffer(id, { offer_status: status }); setOffers(getOffers()) }
  const statusColors = { draft:'neutral', sent:'info', signed:'success', rescinded:'danger' }

  return (
    <>
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
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="signed">Signed</option><option value="rescinded">Rescinded</option>
          </select>
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No offers yet</h3><p>Create your first offer letter to get started.</p></div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Candidate</th><th>Position</th><th>Category</th><th>Compensation</th><th>Valid until</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td><div style={{fontWeight:500}}>{o.candidate_name}</div><div style={{fontSize:11,color:'var(--hint)'}}>{o.nationality}</div></td>
                  <td>{o.position}</td>
                  <td><StatusBadge label={o.category} tone="neutral" /></td>
                  <td><div style={{fontSize:12}}>{o.salary_type === 'monthly' ? formatCurrency(o.salary_monthly) + '/mo' : formatCurrency(o.hourly_rate) + '/hr'}</div></td>
                  <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(o.validity_date || o.valid_until)}</td>
                  <td><StatusBadge label={o.offer_status} tone={statusColors[o.offer_status]||'neutral'} /></td>
                  <td>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button className="btn btn-teal btn-sm" onClick={() => {
                        try {
                          const ref = generateRefNumber('offer_letter')
                          const today = new Date().toISOString().split('T')[0]
                          const workerData = { full_name: o.candidate_name||'Candidate', passport_number: o.passport_number||'—', nationality: o.nationality||'—', trade_role: o.trade_role||o.position||'—', category: o.category||'—', worker_number: o.id||'—', joining_date: o.start_date||'—', housing_allowance: o.housing_allowance||0, transport_allowance: o.transport_allowance||0, food_allowance: o.food_allowance||0 }
                          const offerData = { ...o, trade_role: o.trade_role||o.position||'—', employment_type: o.employment_type||o.category||'—', pay_type: o.pay_type||o.salary_type||'monthly', base_salary_or_rate: o.basic_salary_or_rate||o.salary_monthly||o.hourly_rate||0, housing_allowance: o.housing_allowance||0, transport_allowance: o.transport_allowance||0, food_allowance: o.food_allowance||0, start_date: o.start_date||'—', nationality: o.nationality||'—', passport_number: o.passport_number||'—' }
                          const html = offerLetterHTML(workerData, offerData, ref, today, 'english')
                          setViewerHtml(html); setViewerRef(ref)
                        } catch(err) { console.error(err); alert('Letter error: ' + err.message) }
                      }}>📄 Letter</button>
                      {o.offer_status === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(o.id,'sent')}>Mark Sent</button>}
                      {o.offer_status === 'sent' && <button className="btn btn-teal btn-sm" onClick={() => handleStatusChange(o.id,'signed')}>Mark Signed</button>}
                      {o.offer_status === 'sent' && <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(o.id,'rescinded')}>Rescind</button>}
                      {o.offer_status === 'signed' && <Link href="/onboarding" className="btn btn-teal btn-sm">→ Onboarding</Link>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Create Offer Letter" subtitle="Draft a new offer for a candidate" onClose={() => { setShowDrawer(false); setFormErrors([]) }}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => { setShowDrawer(false); setFormErrors([]) }}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={!!blacklistWarning}>Create Offer</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            {blacklistWarning && <div className="notice danger"><strong>Blacklist match:</strong> {blacklistWarning.full_name} — {blacklistWarning.reason}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">First name *</label><input className="form-input" value={form.first_name} onChange={e => setForm({...form, first_name:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Last name *</label><input className="form-input" value={form.last_name} onChange={e => setForm({...form, last_name:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Passport number *</label><input className="form-input" value={form.passport_number} onChange={e => handlePassportCheck(e.target.value)} placeholder="Auto-checks blacklist" /></div>
              <div className="form-field"><label className="form-label">Nationality *</label><select className="form-select" value={form.nationality} onChange={e => setForm({...form, nationality:e.target.value})}><option value="">Select nationality</option>{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm({...form, email:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Position / Trade *</label><select className="form-select" value={form.trade_role} onChange={e => setForm({...form, trade_role:e.target.value})}><option value="">Select position</option>{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{['Permanent Staff','Contract Worker','Subcontract Worker','Office Staff'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Employment type</label><select className="form-select" value={form.employment_type} onChange={e => setForm({...form, employment_type:e.target.value})}><option value="Open-ended">Open-ended</option><option value="Fixed-term">Fixed-term</option></select></div>
              <div className="form-field"><label className="form-label">Pay type</label><select className="form-select" value={form.pay_type} onChange={e => setForm({...form, pay_type:e.target.value})}><option value="monthly">Monthly salary</option><option value="hourly">Hourly rate</option></select></div>
              <div className="form-field"><label className="form-label">{form.pay_type === 'monthly' ? 'Basic salary (AED) *' : 'Hourly rate (AED) *'}</label><input className="form-input" type="number" value={form.basic_salary_or_rate} onChange={e => setForm({...form, basic_salary_or_rate:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Start date *</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Valid until</label><input className="form-input" type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until:e.target.value})} /></div>
            </div>
            {form.pay_type === 'monthly' && (
              <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px',border:'0.5px solid var(--border)'}}>
                <div style={{fontSize:11,fontWeight:500,color:'var(--muted)',marginBottom:8}}>ALLOWANCE BREAKDOWN</div>
                <div className="form-grid">
                  <div className="form-field"><label className="form-label">Housing (AED)</label><input className="form-input" type="number" value={form.housing_allowance} onChange={e => setForm({...form, housing_allowance:e.target.value})} /></div>
                  <div className="form-field"><label className="form-label">Transport (AED)</label><input className="form-input" type="number" value={form.transport_allowance} onChange={e => setForm({...form, transport_allowance:e.target.value})} /></div>
                  <div className="form-field"><label className="form-label">Food (AED)</label><input className="form-input" type="number" value={form.food_allowance} onChange={e => setForm({...form, food_allowance:e.target.value})} /></div>
                  <div className="form-field"><label className="form-label">Other (AED)</label><input className="form-input" type="number" value={form.other_allowance} onChange={e => setForm({...form, other_allowance:e.target.value})} /></div>
                </div>
                <div style={{marginTop:8,fontSize:13,fontWeight:600,color:'var(--teal)'}}>Total package: {formatCurrency(totalPackage)}/month</div>
              </div>
            )}
            {otRates && <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px',border:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:500,color:'var(--muted)',marginBottom:8}}>OT RATES (AUTO-CALCULATED)</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>Hourly equiv.</div><div style={{fontSize:13,fontWeight:500}}>AED {otRates.hourlyEquiv}/hr</div></div>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>OT 1.25x</div><div style={{fontSize:13,fontWeight:500}}>AED {otRates.ot125}/hr</div></div>
                <div><div style={{fontSize:11,color:'var(--hint)'}}>OT 1.50x</div><div style={{fontSize:13,fontWeight:500}}>AED {otRates.ot150}/hr</div></div>
              </div>
            </div>}
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} rows={2} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
    {viewerHtml && <LetterViewer html={viewerHtml} refNumber={viewerRef} onClose={() => { setViewerHtml(null); setViewerRef('') }} />}
    </>
  )
}

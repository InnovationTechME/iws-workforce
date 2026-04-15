'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { checkBlacklist, makeId, generateRefNumber, addLetter } from '../../lib/mockStore'
import { getOffers, addOffer, updateOffer, acceptOffer, rejectOffer } from '../../lib/offerService'
import { formatCurrency, formatDate, getStatusTone, calculateOTRates, passportExpiryGap, looksLikeCompanyName } from '../../lib/utils'
import { NATIONALITIES, POSITIONS } from '../../data/constants'
import { offerLetterHTML } from '../../lib/letterTemplates'
import LetterViewer from '../../components/LetterViewer'

export default function OffersPageWrapper() {
  return <Suspense fallback={null}><OffersPage /></Suspense>
}

function OffersPage() {
  const [offers, setOffers] = useState([])
  const [filter, setFilter] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [blacklistWarning, setBlacklistWarning] = useState(null)
  const [formErrors, setFormErrors] = useState([])
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [viewerHtml, setViewerHtml] = useState(null)
  const [viewerRef, setViewerRef] = useState('')
  const emptyForm = () => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    const validUntil = d.toISOString().split('T')[0]
    return { first_name:'', last_name:'', passport_number:'', passport_expiry:'', nationality:'', email:'', trade_role:'', category:'Permanent Staff', employment_type:'Fixed-term (2 years, renewable)', pay_type:'monthly', basic_salary_or_rate:'', housing_allowance:0, transport_allowance:0, food_allowance:0, other_allowance:0, start_date:'', valid_until:validUntil, notes:'' }
  }
  const [form, setForm] = useState(emptyForm())

  const openDrawer = () => { setForm(emptyForm()); setFormError(null); setFormErrors([]); setBlacklistWarning(null); setShowDrawer(true) }
  const handleCategoryChange = (category) => {
    setForm(prev => {
      const next = { ...prev, category }
      if (category === 'Permanent Staff') {
        next.housing_allowance = 0
        next.transport_allowance = 0
      }
      return next
    })
  }

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const rows = await getOffers()
        if (!cancelled) setOffers(rows)
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load offers')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ?new=1 auto-opens the Create Offer drawer (used by the /workers Add Worker
  // re-route and by the /onboarding Direct Staff track redirect).
  useEffect(() => {
    if (searchParams?.get('new') === '1') {
      openDrawer()
      router.replace('/offers')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const filtered = filter === 'all' ? offers : offers.filter(o => o.status === filter)

  // Passport expiry validation — must be at least 7 months after the joining date (§5.3.6)
  const passportExpiryStatus = (() => {
    if (!form.passport_expiry) return { valid: null, message: 'Passport expiry required — needed for visa eligibility check', tone: 'warning' }
    if (!form.start_date) return { valid: null, message: 'Enter the start (joining) date to validate passport expiry', tone: 'warning' }
    const gap = passportExpiryGap(form.passport_expiry, form.start_date, 7)
    if (gap.ok) return { valid: true, message: `Valid — passport expires ${formatDate(form.passport_expiry)} (≥7 months from joining)`, tone: 'success' }
    if (gap.reason === 'too_soon') {
      return { valid: false, tone: 'danger',
        message: `Passport expires before the 7-month minimum from joining date (${formatDate(form.start_date)}). Only ${gap.monthsFromJoining} months of validity at joining. Renew passport before issuing offer.` }
    }
    return { valid: false, tone: 'danger', message: 'Passport expiry date is invalid' }
  })()
  const passportExpiryBlocked = passportExpiryStatus.valid === false

  const basicAmt = Number(form.basic_salary_or_rate) || 0
  const isPermanent = form.category === 'Permanent Staff'
  const totalPackage = basicAmt + (Number(form.housing_allowance)||0) + (Number(form.transport_allowance)||0) + (Number(form.food_allowance)||0) + (Number(form.other_allowance)||0)
  const otRates = isPermanent && basicAmt ? calculateOTRates(basicAmt, 'monthly') : null

  const handlePassportCheck = (passport) => {
    setForm({...form, passport_number: passport})
    if (passport.length > 5) {
      setBlacklistWarning(checkBlacklist(passport))
    } else {
      setBlacklistWarning(null)
    }
  }

  const handleCreate = async () => {
    const errors = []
    if (!form.first_name?.trim()) errors.push('First name is required')
    if (!form.last_name?.trim()) errors.push('Last name is required')
    const composedName = `${form.first_name || ''} ${form.last_name || ''}`.trim()
    if (looksLikeCompanyName(form.first_name) || looksLikeCompanyName(form.last_name) || looksLikeCompanyName(composedName)) {
      errors.push("Enter the candidate's name, not the company name.")
    }
    if (!form.passport_number?.trim()) errors.push('Passport number is required')
    if (!form.nationality) errors.push('Nationality is required')
    if (!form.trade_role) errors.push('Position / trade is required')
    if (!basicAmt) errors.push('Monthly salary is required')
    if (!form.passport_expiry) errors.push('Passport expiry date is required')
    if (!form.start_date) errors.push('Start date is required')
    if (passportExpiryBlocked && form.passport_expiry && form.start_date) {
      errors.push('Passport expiry is before the 7-month minimum from joining date')
    }
    if (errors.length > 0) { setFormErrors(errors); return }
    setFormErrors([])
    setFormError(null)
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        nationality: form.nationality,
        passport_number: form.passport_number,
        trade_role: form.trade_role,
        category: form.category,
        monthly_salary: basicAmt,
        housing_allowance: form.housing_allowance,
        transport_allowance: form.transport_allowance,
        food_allowance: form.food_allowance,
        joining_date: form.start_date,
        valid_until: form.valid_until
      }
      const created = await addOffer(payload)
      setOffers(await getOffers())
      setShowDrawer(false)
      setSuccessMsg(`Offer created — ${created.ref_number}`)
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      setFormError(err?.message || 'Failed to create offer')
    }
  }

  const handleStatusChange = async (id, status) => {
    try { await updateOffer(id, { status }); setOffers(await getOffers()) } catch (err) { setLoadError(err?.message || 'Failed to refresh offers') }
  }
  const statusColors = { draft:'neutral', sent:'info', accepted:'success', rejected:'danger', signed:'success', rescinded:'danger' }

  // Accept flow — captures signed PDF before status flips
  const [acceptingOffer, setAcceptingOffer] = useState(null)
  const [acceptFile, setAcceptFile] = useState(null)
  const [acceptBusy, setAcceptBusy] = useState(false)
  const [acceptError, setAcceptError] = useState(null)
  const openAccept = (offer) => { setAcceptingOffer(offer); setAcceptFile(null); setAcceptError(null) }
  const closeAccept = () => { setAcceptingOffer(null); setAcceptFile(null); setAcceptError(null); setAcceptBusy(false) }
  const confirmAccept = async () => {
    if (!acceptFile) { setAcceptError('Please select the signed offer PDF before accepting'); return }
    setAcceptBusy(true); setAcceptError(null)
    try {
      await acceptOffer(acceptingOffer.id, acceptFile)
      setOffers(await getOffers())
      setSuccessMsg(`Offer accepted — ${acceptingOffer.ref_number || acceptingOffer.full_name} moved to Onboarding`)
      setTimeout(() => setSuccessMsg(null), 5000)
      closeAccept()
    } catch (err) {
      setAcceptError(err?.message || 'Failed to accept offer')
      setAcceptBusy(false)
    }
  }

  const handleReject = async (offer) => {
    if (!confirm(`Reject offer for ${offer.full_name || offer.candidate_name}? This cannot be undone.`)) return
    try {
      await rejectOffer(offer.id)
      setOffers(await getOffers())
      setSuccessMsg(`Offer rejected — ${offer.ref_number || offer.full_name}`)
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      setLoadError(err?.message || 'Failed to reject offer')
    }
  }

  return (
    <>
    <AppShell pageTitle="Offers">
      <PageHeader eyebrow="Offers" title="Offer register" description="Create and track offer letters from draft through to signed acceptance."
        actions={<button className="btn btn-primary" onClick={openDrawer}>+ Create Offer Letter</button>} />

      {successMsg && <div style={{background:'#d1fae5',border:'1px solid #10b981',borderRadius:6,padding:'10px 14px',color:'#065f46',fontSize:13,marginBottom:8}}>✓ {successMsg}</div>}

      <div style={{background:'#0d9488',color:'#fff',borderRadius:8,padding:'10px 14px',fontSize:12,lineHeight:1.5,marginBottom:4}}>
        Offer letters are for Innovation Tech direct staff only (Permanent Staff &amp; Office Staff). To add a Contract Worker or register a Supplier Company Worker, go to <Link href="/onboarding" style={{color:'#fff',textDecoration:'underline',fontWeight:500}}>Onboarding</Link>.
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[['All',offers.length,'neutral'],['Draft',offers.filter(o=>o.status==='draft').length,'neutral'],['Sent',offers.filter(o=>o.status==='sent').length,'info'],['Accepted',offers.filter(o=>o.status==='accepted'||o.status==='signed').length,'success']].map(([label,count,tone]) => (
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
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option>
          </select>
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No offers yet</h3><p>Create your first offer letter to get started.</p></div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Candidate</th><th>Position</th><th>Category</th><th>Compensation</th><th>Passport Expiry</th><th>Valid until</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td>
                    <div style={{fontWeight:500}}>
                      {o.full_name ? o.full_name : <span style={{color:'var(--hint)',fontStyle:'italic'}}>(unnamed)</span>}
                      {looksLikeCompanyName(o.full_name) && <span style={{marginLeft:6,color:'#b45309',fontSize:11,fontWeight:500}} title="Candidate name is the company name — please update">⚠️ (please update)</span>}
                    </div>
                    <div style={{fontSize:11,color:'var(--hint)'}}>{o.nationality}</div>
                  </td>
                  <td>{o.trade_role || o.position}</td>
                  <td><StatusBadge label={o.category} tone="neutral" /></td>
                  <td><div style={{fontSize:12}}>{formatCurrency(o.monthly_salary || o.salary_monthly || 0)}/mo</div></td>
                  <td>{(() => {
                    if (!o.passport_expiry) return <span style={{fontSize:11,color:'var(--hint)'}}>—</span>
                    const exp = new Date(o.passport_expiry)
                    const months = Math.round((exp - new Date()) / (1000*60*60*24*30.44))
                    const tone = months < 7 ? 'danger' : months < 12 ? 'warning' : 'success'
                    return <StatusBadge label={`${formatDate(o.passport_expiry)} (${months}mo)`} tone={tone} />
                  })()}</td>
                  <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(o.validity_date || o.valid_until)}</td>
                  <td><StatusBadge label={o.status} tone={statusColors[o.status]||'neutral'} /></td>
                  <td>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button className="btn btn-teal btn-sm" onClick={() => {
                        try {
                          const ref = generateRefNumber('offer_letter')
                          const today = new Date().toISOString().split('T')[0]
                          const workerData = { full_name: o.full_name||o.candidate_name||'Candidate', passport_number: o.passport_number||'—', nationality: o.nationality||'—', trade_role: o.trade_role||o.position||'—', category: o.category||'—', worker_number: o.id||'—', joining_date: o.joining_date||o.start_date||'—', housing_allowance: o.housing_allowance||0, transport_allowance: o.transport_allowance||0, food_allowance: o.food_allowance||0 }
                          const offerData = { ...o, trade_role: o.trade_role||o.position||'—', employment_type: o.employment_type||o.category||'—', pay_type: 'monthly', base_salary_or_rate: o.monthly_salary||o.basic_salary_or_rate||0, housing_allowance: o.housing_allowance||0, transport_allowance: o.transport_allowance||0, food_allowance: o.food_allowance||0, start_date: o.joining_date||o.start_date||'—', nationality: o.nationality||'—', passport_number: o.passport_number||'—' }
                          const html = offerLetterHTML(workerData, offerData, ref, today, 'english')
                          setViewerHtml(html); setViewerRef(ref)
                        } catch(err) { console.error(err); alert('Letter error: ' + err.message) }
                      }}>📄 Letter</button>
                      {o.status === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(o.id,'sent')}>Mark Sent</button>}
                      {o.status === 'sent' && <button className="btn btn-sm" style={{background:'#16a34a',color:'#fff',fontWeight:600}} onClick={() => openAccept(o)}>✓ Accept &amp; Upload Signed Offer</button>}
                      {o.status === 'sent' && <button className="btn btn-sm" style={{background:'#dc2626',color:'#fff',fontWeight:600}} onClick={() => handleReject(o)}>✕ Reject</button>}
                      {(o.status === 'accepted' || o.status === 'signed') && <Link href="/onboarding" className="btn btn-teal btn-sm">→ Onboarding</Link>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Create Offer Letter" subtitle="Draft a new offer for a candidate" onClose={() => { setShowDrawer(false); setFormErrors([]); setFormError(null) }}
          footer={<div style={{display:'flex',flexDirection:'column',gap:0,width:'100%'}}>
            {formError && (
              <div style={{background:'#fee2e2',border:'1px solid #ef4444',borderRadius:'6px',padding:'12px',marginBottom:'12px',color:'#991b1b',fontSize:'14px'}}>
                <strong>Error:</strong> {formError}
              </div>
            )}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-secondary" onClick={() => { setShowDrawer(false); setFormErrors([]); setFormError(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!!blacklistWarning || passportExpiryBlocked} title={passportExpiryBlocked ? 'Passport expiry too soon for visa application' : ''}>Create Offer</button>
            </div>
          </div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {formErrors.length > 0 && <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>{formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}</div>}
            {blacklistWarning && <div className="notice danger"><strong>Blacklist match:</strong> {blacklistWarning.full_name} — {blacklistWarning.reason}</div>}
            <div className="form-grid">
              <div className="form-field"><label className="form-label">First name *</label><input className="form-input" value={form.first_name} onChange={e => setForm({...form, first_name:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Last name *</label><input className="form-input" value={form.last_name} onChange={e => setForm({...form, last_name:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Passport number *</label><input className="form-input" value={form.passport_number} onChange={e => handlePassportCheck(e.target.value)} placeholder="Auto-checks blacklist" /></div>
              <div className="form-field">
                <label className="form-label">Passport expiry date *</label>
                <input className="form-input" type="date" value={form.passport_expiry} onChange={e => setForm({...form, passport_expiry:e.target.value})} style={passportExpiryBlocked ? {borderColor:'var(--danger)'} : {}} />
                {passportExpiryStatus.tone === 'danger' && <div style={{marginTop:4,padding:'6px 10px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:4,fontSize:11,color:'var(--danger)'}}>⚠ {passportExpiryStatus.message}</div>}
                {passportExpiryStatus.tone === 'success' && <div style={{marginTop:4,fontSize:11,color:'var(--success)',fontWeight:500}}>✓ {passportExpiryStatus.message}</div>}
                {passportExpiryStatus.tone === 'warning' && <div style={{marginTop:4,fontSize:11,color:'var(--warning)'}}>⚠ {passportExpiryStatus.message}</div>}
              </div>
              <div className="form-field"><label className="form-label">Nationality *</label><select className="form-select" value={form.nationality} onChange={e => setForm({...form, nationality:e.target.value})}><option value="">Select nationality</option>{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm({...form, email:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Position / Trade *</label><select className="form-select" value={form.trade_role} onChange={e => setForm({...form, trade_role:e.target.value})}><option value="">Select position</option>{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e => handleCategoryChange(e.target.value)}>{['Permanent Staff','Office Staff'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Employment type</label><select className="form-select" value={form.employment_type} onChange={e => setForm({...form, employment_type:e.target.value})}><option value="Fixed-term (2 years, renewable)">Fixed-term (2 years, renewable)</option></select></div>
              <div className="form-field"><label className="form-label">Monthly salary (AED) *</label><input className="form-input" type="number" value={form.basic_salary_or_rate} onChange={e => setForm({...form, basic_salary_or_rate:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Start date *</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date:e.target.value})} /></div>
              <div className="form-field">
                <label className="form-label">Valid until</label>
                <input className="form-input" type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until:e.target.value})} />
                <div style={{fontSize:11,color:'var(--hint)',marginTop:4}}>Offer letters are valid for 7 days only</div>
              </div>
            </div>
            <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px',border:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:500,color:'var(--muted)',marginBottom:8}}>ALLOWANCE BREAKDOWN</div>
              <div className="form-grid">
                {!isPermanent && <div className="form-field"><label className="form-label">Housing (AED)</label><input className="form-input" type="number" value={form.housing_allowance} onChange={e => setForm({...form, housing_allowance:e.target.value})} /></div>}
                {!isPermanent && <div className="form-field"><label className="form-label">Transport (AED)</label><input className="form-input" type="number" value={form.transport_allowance} onChange={e => setForm({...form, transport_allowance:e.target.value})} /></div>}
                <div className="form-field"><label className="form-label">Food (AED)</label><input className="form-input" type="number" value={form.food_allowance} onChange={e => setForm({...form, food_allowance:e.target.value})} /></div>
                <div className="form-field"><label className="form-label">Other (AED)</label><input className="form-input" type="number" value={form.other_allowance} onChange={e => setForm({...form, other_allowance:e.target.value})} /></div>
              </div>
              <div style={{marginTop:8,fontSize:13,fontWeight:600,color:'var(--teal)'}}>Total package: {formatCurrency(totalPackage)}/month</div>
            </div>
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
    {acceptingOffer && (
      <DrawerForm
        title={`Accept offer — ${acceptingOffer.ref_number || acceptingOffer.full_name}`}
        subtitle="Upload the signed offer letter to complete acceptance"
        onClose={() => { if (!acceptBusy) closeAccept() }}
        footer={
          <div style={{display:'flex',flexDirection:'column',gap:8,width:'100%'}}>
            {acceptError && <div style={{background:'#fee2e2',border:'1px solid #ef4444',borderRadius:6,padding:'10px 12px',color:'#991b1b',fontSize:12}}>⚠ {acceptError}</div>}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-secondary" onClick={closeAccept} disabled={acceptBusy}>Cancel</button>
              <button className="btn btn-sm" style={{background:'#16a34a',color:'#fff',fontWeight:600,padding:'10px 16px'}} onClick={confirmAccept} disabled={acceptBusy || !acceptFile}>
                {acceptBusy ? 'Uploading & accepting…' : '✓ Confirm Accept'}
              </button>
            </div>
          </div>
        }>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#ecfdf5',border:'1px solid #6ee7b7',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#065f46'}}>
            Accepting this offer will upload the signed PDF, create the worker record, and move the candidate into Onboarding. This action cannot be undone without manual database cleanup.
          </div>
          <div><div style={{fontSize:11,color:'var(--hint)'}}>Candidate</div><div style={{fontSize:14,fontWeight:500}}>{acceptingOffer.full_name}</div></div>
          <div className="form-grid">
            <div><div style={{fontSize:11,color:'var(--hint)'}}>Position</div><div style={{fontSize:13}}>{acceptingOffer.trade_role}</div></div>
            <div><div style={{fontSize:11,color:'var(--hint)'}}>Category</div><div style={{fontSize:13}}>{acceptingOffer.category}</div></div>
            <div><div style={{fontSize:11,color:'var(--hint)'}}>Monthly salary</div><div style={{fontSize:13}}>{formatCurrency(acceptingOffer.monthly_salary || 0)}</div></div>
            <div><div style={{fontSize:11,color:'var(--hint)'}}>Joining date</div><div style={{fontSize:13}}>{formatDate(acceptingOffer.joining_date)}</div></div>
          </div>
          <div className="form-field">
            <label className="form-label">Signed offer PDF *</label>
            <input type="file" className="form-input" accept=".pdf,.PDF" onChange={e => { setAcceptFile(e.target.files?.[0] || null); setAcceptError(null) }} />
            {acceptFile && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>📎 {acceptFile.name}</div>}
          </div>
        </div>
      </DrawerForm>
    )}
    </>
  )
}

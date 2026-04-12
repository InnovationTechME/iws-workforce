'use client'
import { useState, useEffect, useMemo } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { supabase } from '../../lib/supabaseClient'
import { getOnboardingRecords, upsertOnboarding, completeOnboarding } from '../../lib/onboardingService'
import { addWorker, updateWorker, getNextWorkerNumber } from '../../lib/workerService'
import { getSuppliers, getSupplierRates } from '../../lib/supplierService'
import { checkBlacklist } from '../../lib/blacklistService'
import { getDocumentTemplate, initialiseWorkerDocuments } from '../../lib/documentRegister'
import { NATIONALITIES, POSITIONS } from '../../data/constants'
import { formatDate } from '../../lib/utils'

const TRACKS = {
  direct_staff: {
    key: 'direct_staff',
    label: 'IT Direct Staff',
    color: '#0d9488',
    bgSelected: '#f0fdfa',
    description: 'Permanent Staff and Office Staff joining Innovation Technologies directly. Full onboarding with offer letter, medical, labour card, ILOE and C3 card setup.'
  },
  contract_worker: {
    key: 'contract_worker',
    label: 'Contract Workers',
    color: '#2563eb',
    bgSelected: '#eff6ff',
    description: "Hourly workers engaged directly by Innovation Tech on their own visa. Simplified onboarding — passport, visa, ID, WC and health insurance required. C3 card setup."
  },
  subcontractor_company_worker: {
    key: 'subcontractor_company_worker',
    label: 'Supplier Company Workers',
    color: '#64748b',
    bgSelected: '#f8fafc',
    description: 'Workers supplied by Company A, B or C under a Purchase Order. Site registration only — passport, visa and WC required. Not on IT payroll.'
  }
}

function sevenMonthsFromNow() {
  const d = new Date(); d.setMonth(d.getMonth() + 7)
  return d
}

function passportExpiryValid(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) >= sevenMonthsFromNow()
}

function emptyForm(track) {
  return {
    first_name: '', last_name: '', nationality: '',
    passport_number: '', passport_expiry: '',
    trade_role: '',
    category: track === 'direct_staff' ? 'Permanent Staff' : track === 'contract_worker' ? 'Contract Worker' : 'Subcontract Worker',
    monthly_salary: '', hourly_rate: '',
    food_allowance: '', housing_allowance: '', transport_allowance: '', other_allowance: '',
    joining_date: '',
    supplier_id: '', supplier_rate: ''
  }
}

export default function OnboardingPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(null)

  const [selectedTrack, setSelectedTrack] = useState(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState(emptyForm('direct_staff'))
  const [formErrors, setFormErrors] = useState([])
  const [formError, setFormError] = useState(null)
  const [blacklistHit, setBlacklistHit] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const [suppliers, setSuppliers] = useState([])
  const [supplierRates, setSupplierRates] = useState([])

  const [checklistWorker, setChecklistWorker] = useState(null)
  const [workerDocs, setWorkerDocs] = useState([])

  const refresh = async () => {
    setLoading(true)
    try {
      const rows = await getOnboardingRecords()
      setRecords(rows)
      setLoadErr(null)
    } catch (e) {
      setLoadErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => { getSuppliers().then(setSuppliers).catch(() => setSuppliers([])) }, [])
  useEffect(() => {
    if (form.supplier_id) {
      getSupplierRates(form.supplier_id).then(setSupplierRates).catch(() => setSupplierRates([]))
    } else {
      setSupplierRates([])
    }
  }, [form.supplier_id])

  useEffect(() => {
    if (form.supplier_id && form.trade_role && supplierRates.length) {
      const match = supplierRates.find(r => r.trade_role === form.trade_role)
      if (match) setForm(f => ({ ...f, supplier_rate: match.hourly_rate }))
    }
  }, [form.trade_role, supplierRates])

  const counts = useMemo(() => {
    const c = { direct_staff: 0, contract_worker: 0, subcontractor_company_worker: 0 }
    for (const r of records) if (c[r.entry_track] !== undefined) c[r.entry_track]++
    return c
  }, [records])

  const filteredRecords = useMemo(() => {
    if (!selectedTrack) return records
    return records.filter(r => r.entry_track === selectedTrack)
  }, [records, selectedTrack])

  const openDrawer = () => {
    if (!selectedTrack) return
    setForm(emptyForm(selectedTrack))
    setFormErrors([])
    setFormError(null)
    setBlacklistHit(null)
    setShowDrawer(true)
  }

  const handlePassportBlur = async () => {
    if (form.passport_number?.length > 5) {
      try { setBlacklistHit(await checkBlacklist(form.passport_number)) }
      catch { setBlacklistHit(null) }
    }
  }

  const validate = () => {
    const errs = []
    if (!form.first_name?.trim()) errs.push('First name is required')
    if (!form.last_name?.trim()) errs.push('Last name is required')
    if (!form.nationality) errs.push('Nationality is required')
    if (!form.passport_number?.trim()) errs.push('Passport number is required')
    if (!form.passport_expiry) errs.push('Passport expiry is required')
    else if (selectedTrack !== 'subcontractor_company_worker' && !passportExpiryValid(form.passport_expiry)) {
      errs.push('Passport must be valid for at least 7 more months')
    }
    if (!form.trade_role) errs.push('Position / trade is required')
    if (selectedTrack === 'direct_staff') {
      if (!form.monthly_salary) errs.push('Monthly salary is required')
    }
    if (selectedTrack === 'contract_worker') {
      if (!form.hourly_rate) errs.push('Hourly rate is required')
    }
    if (selectedTrack === 'subcontractor_company_worker') {
      if (!form.supplier_id) errs.push('Supplier company is required')
      if (!form.supplier_rate) errs.push('Agreed hourly rate is required')
    }
    return errs
  }

  const handleCreate = async () => {
    const errs = validate()
    if (errs.length) { setFormErrors(errs); return }
    if (blacklistHit) { setFormError('Passport is blacklisted — cannot onboard'); return }

    setSaving(true); setFormError(null)
    try {
      const worker_number = await getNextWorkerNumber()
      const full_name = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
      const base = {
        worker_number,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        full_name,
        nationality: form.nationality,
        passport_number: form.passport_number.trim(),
        passport_expiry: form.passport_expiry || null,
        trade_role: form.trade_role,
        category: form.category,
        status: 'onboarding',
        entry_track: selectedTrack,
        joining_date: form.joining_date || null,
      }

      let payload
      if (selectedTrack === 'direct_staff') {
        payload = {
          ...base,
          monthly_salary: parseFloat(form.monthly_salary) || null,
          food_allowance: parseFloat(form.food_allowance) || 0,
          housing_allowance: form.category === 'Office Staff' ? (parseFloat(form.housing_allowance) || 0) : 0,
          transport_allowance: form.category === 'Office Staff' ? (parseFloat(form.transport_allowance) || 0) : 0,
          other_allowance: parseFloat(form.other_allowance) || 0,
          payment_method: 'WPS'
        }
      } else if (selectedTrack === 'contract_worker') {
        payload = {
          ...base,
          category: 'Contract Worker',
          hourly_rate: parseFloat(form.hourly_rate) || null,
          food_allowance: parseFloat(form.food_allowance) || 0,
          other_allowance: parseFloat(form.other_allowance) || 0,
          payment_method: 'WPS'
        }
      } else {
        payload = {
          ...base,
          category: 'Subcontract Worker',
          subcontractor_type: 'invoice',
          supplier_id: form.supplier_id,
          supplier_rate: parseFloat(form.supplier_rate) || null,
          payment_method: 'Non-WPS'
        }
      }

      const created = await addWorker(payload)
      if (!created) throw new Error('Failed to create worker — check unique constraints')

      await initialiseWorkerDocuments(created, supabase)
      await upsertOnboarding(created.id, { created_at: new Date().toISOString() })

      if (selectedTrack === 'contract_worker') {
        await supabase.from('tasks').insert([{
          worker_id: created.id,
          task_type: 'c3_card_setup',
          title: `Set up C3 card for ${full_name}`,
          status: 'open'
        }])
      }

      setToast(`${worker_number} ${full_name} added to onboarding`)
      setTimeout(() => setToast(null), 4000)
      setShowDrawer(false)
      await refresh()
    } catch (e) {
      setFormError(e.message || 'Failed to create worker')
    } finally {
      setSaving(false)
    }
  }

  const openChecklist = async (worker) => {
    setChecklistWorker(worker)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('worker_id', worker.id)
    setWorkerDocs(data || [])
  }

  const closeChecklist = () => { setChecklistWorker(null); setWorkerDocs([]) }

  const getProgress = (worker) => {
    const tpl = getDocumentTemplate(worker)
    const blocking = tpl.filter(t => t.is_blocking)
    if (!blocking.length) return 0
    // Can't know doc status without a query per row, so use worker onboarding row booleans fallback
    return null
  }

  const blockingStatus = (worker, docs) => {
    const tpl = getDocumentTemplate(worker).filter(t => t.is_blocking)
    const done = tpl.filter(t => {
      const d = docs.find(x => x.doc_type === t.doc_type)
      if (!d) return false
      if (d.status !== 'valid' && d.status !== 'expiring_soon') return false
      if (t.requires_highlight && d.highlighted_name_confirmed !== true) return false
      return true
    })
    return { total: tpl.length, done: done.length, allDone: done.length === tpl.length, items: tpl, docs }
  }

  const handleConvert = async () => {
    if (!checklistWorker) return
    const bs = blockingStatus(checklistWorker, workerDocs)
    if (!bs.allDone) return
    try {
      await completeOnboarding(checklistWorker.id)
      // Ensure C3 card task exists for tracks 1 and 2
      if (checklistWorker.entry_track === 'direct_staff' || checklistWorker.entry_track === 'contract_worker') {
        const { data: existingTask } = await supabase
          .from('tasks').select('id')
          .eq('worker_id', checklistWorker.id)
          .eq('task_type', 'c3_card_setup')
          .limit(1)
        if (!existingTask || existingTask.length === 0) {
          await supabase.from('tasks').insert([{
            worker_id: checklistWorker.id,
            task_type: 'c3_card_setup',
            title: `Set up C3 card for ${checklistWorker.full_name}`,
            status: 'open'
          }])
        }
      }
      setToast(`${checklistWorker.worker_number} ${checklistWorker.full_name} is now active`)
      setTimeout(() => setToast(null), 4000)
      closeChecklist()
      await refresh()
    } catch (e) {
      alert('Convert failed: ' + e.message)
    }
  }

  const renderTrackCard = (track) => {
    const t = TRACKS[track]
    const selected = selectedTrack === track
    return (
      <div key={track}
        onClick={() => setSelectedTrack(selected ? null : track)}
        style={{
          flex: 1,
          cursor: 'pointer',
          border: `2px solid ${selected ? t.color : 'var(--border)'}`,
          background: selected ? t.bgSelected : '#fff',
          borderRadius: 12,
          padding: '18px 20px',
          transition: 'all .15s',
          minHeight: 180
        }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:t.color}}>{t.label}</h3>
          <span style={{background:t.color,color:'#fff',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
            {counts[track]} in progress
          </span>
        </div>
        <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.5,margin:0}}>{t.description}</p>
      </div>
    )
  }

  return (
    <AppShell pageTitle="Onboarding">
      <PageHeader eyebrow="Onboarding" title="Three-track onboarding"
        description="Select the track that matches how the worker is engaged. Each track has its own document checklist and pay setup." />

      {toast && <div style={{background:'#d1fae5',border:'1px solid #10b981',borderRadius:6,padding:'10px 14px',color:'#065f46',fontSize:13,marginBottom:12}}>✓ {toast}</div>}
      {loadErr && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,padding:'10px 14px',color:'#dc2626',fontSize:13,marginBottom:12}}>⚠ {loadErr}</div>}

      <div style={{display:'flex',gap:14,marginBottom:16}}>
        {Object.keys(TRACKS).map(renderTrackCard)}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:13,color:'var(--muted)'}}>
          {selectedTrack ? `Showing ${filteredRecords.length} ${TRACKS[selectedTrack].label} in onboarding` : `All ${records.length} workers currently in onboarding`}
        </div>
        <button
          className="btn btn-teal"
          disabled={!selectedTrack}
          onClick={openDrawer}
          style={!selectedTrack ? {opacity:0.55,cursor:'not-allowed'} : {}}>
          {selectedTrack ? `+ Add New ${TRACKS[selectedTrack].label}` : 'Select a track above to add a worker'}
        </button>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state"><h3>No workers in onboarding</h3><p>Use &ldquo;Add New&rdquo; to start onboarding a worker for the selected track.</p></div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filteredRecords.map(w => <OnboardingRow key={w.id} worker={w} onOpen={openChecklist} />)}
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm
          title={`Add New ${TRACKS[selectedTrack].label}`}
          subtitle="Starts onboarding for this worker"
          onClose={() => setShowDrawer(false)}
          footer={
            <div style={{display:'flex',flexDirection:'column',gap:8,width:'100%'}}>
              {formError && <div style={{background:'#fee2e2',border:'1px solid #ef4444',borderRadius:6,padding:'10px 12px',color:'#991b1b',fontSize:12}}>⚠ {formError}</div>}
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={saving} onClick={handleCreate}>{saving ? 'Saving…' : 'Create & start onboarding'}</button>
              </div>
            </div>
          }>
          <WorkerForm
            track={selectedTrack}
            form={form}
            setForm={setForm}
            formErrors={formErrors}
            blacklistHit={blacklistHit}
            onPassportBlur={handlePassportBlur}
            suppliers={suppliers}
          />
        </DrawerForm>
      )}

      {checklistWorker && (
        <ChecklistDrawer
          worker={checklistWorker}
          docs={workerDocs}
          blockingStatus={blockingStatus(checklistWorker, workerDocs)}
          onClose={closeChecklist}
          onConvert={handleConvert}
        />
      )}
    </AppShell>
  )
}

function OnboardingRow({ worker, onOpen }) {
  const [docs, setDocs] = useState([])
  useEffect(() => {
    supabase.from('documents').select('*').eq('worker_id', worker.id).then(r => setDocs(r.data || []))
  }, [worker.id])
  const tpl = getDocumentTemplate(worker).filter(t => t.is_blocking)
  const done = tpl.filter(t => {
    const d = docs.find(x => x.doc_type === t.doc_type)
    return d && (d.status === 'valid' || d.status === 'expiring_soon') && (!t.requires_highlight || d.highlighted_name_confirmed === true)
  }).length
  const pct = tpl.length ? Math.round((done / tpl.length) * 100) : 0
  const track = TRACKS[worker.entry_track]

  return (
    <div style={{border:'1px solid var(--border)',borderRadius:8,padding:'14px 16px',background:'#fff',display:'flex',alignItems:'center',gap:16}}>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <span style={{fontWeight:600,fontSize:14}}>{worker.full_name}</span>
          <span style={{fontSize:10,fontWeight:700,color:'#fff',background:track?.color||'#64748b',padding:'2px 8px',borderRadius:10}}>{track?.label||worker.entry_track}</span>
          <span style={{fontSize:11,color:'var(--hint)'}}>{worker.worker_number} · {worker.trade_role}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{flex:1,height:6,background:'var(--border)',borderRadius:3}}>
            <div style={{width:pct+'%',height:'100%',background:pct===100?'var(--success)':track?.color||'#0d9488',borderRadius:3,transition:'width .3s'}} />
          </div>
          <span style={{fontSize:11,fontWeight:600,color:pct===100?'var(--success)':'var(--muted)',minWidth:80,textAlign:'right'}}>{done}/{tpl.length} blocking</span>
        </div>
      </div>
      <StatusBadge label={pct===100?'Ready':'In progress'} tone={pct===100?'success':'info'} />
      <button className="btn btn-teal btn-sm" onClick={() => onOpen(worker)}>View checklist →</button>
    </div>
  )
}

function WorkerForm({ track, form, setForm, formErrors, blacklistHit, onPassportBlur, suppliers }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const expiryWarn = form.passport_expiry && !passportExpiryValid(form.passport_expiry) && track !== 'subcontractor_company_worker'
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {track === 'direct_staff' && (
        <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#155e75'}}>
          Worker must have a signed offer letter before onboarding begins. The offer letter should be created first in the Offers section.
        </div>
      )}
      {track === 'contract_worker' && (
        <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#1e3a8a'}}>
          Contract workers are paid via WPS/C3. A C3 card setup task will be created automatically. No offer letter is issued.
        </div>
      )}
      {track === 'subcontractor_company_worker' && (
        <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#334155'}}>
          This worker is employed by {suppliers.find(s => s.id === form.supplier_id)?.name || '[supplier name]'}, not by Innovation Technologies. They will be tracked for timesheet purposes only and will NOT appear in IT payroll. Their hours will be used to generate monthly supplier invoicing summaries.
        </div>
      )}

      {formErrors.length > 0 && (
        <div style={{background:'#fef2f2',border:'1px solid var(--danger)',borderRadius:6,padding:'10px 12px'}}>
          {formErrors.map(e => <div key={e} style={{color:'var(--danger)',fontSize:12}}>⚠ {e}</div>)}
        </div>
      )}
      {blacklistHit && (
        <div style={{background:'#fef2f2',border:'1px solid #ef4444',borderRadius:6,padding:'10px 12px',color:'#991b1b',fontSize:12}}>
          <strong>Blacklist match:</strong> {blacklistHit.full_name} — {blacklistHit.reason}
        </div>
      )}

      <div className="form-grid">
        <div className="form-field"><label className="form-label">First name *</label><input className="form-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
        <div className="form-field"><label className="form-label">Last name *</label><input className="form-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
        <div className="form-field"><label className="form-label">Nationality *</label>
          <select className="form-select" value={form.nationality} onChange={e => set('nationality', e.target.value)}>
            <option value="">Select nationality</option>
            {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="form-field"><label className="form-label">Passport number *</label>
          <input className="form-input" value={form.passport_number} onChange={e => set('passport_number', e.target.value)} onBlur={onPassportBlur} placeholder="Auto-checks blacklist on blur" />
        </div>
        <div className="form-field"><label className="form-label">Passport expiry *</label>
          <input className="form-input" type="date" value={form.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} style={expiryWarn?{borderColor:'var(--danger)'}:{}} />
          {expiryWarn && <div style={{fontSize:11,color:'var(--danger)',marginTop:4}}>⚠ Passport must be valid for at least 7 more months</div>}
        </div>
        <div className="form-field"><label className="form-label">Position / Trade *</label>
          <select className="form-select" value={form.trade_role} onChange={e => set('trade_role', e.target.value)}>
            <option value="">Select position</option>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {track === 'direct_staff' && <>
          <div className="form-field"><label className="form-label">Category *</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="Permanent Staff">Permanent Staff</option>
              <option value="Office Staff">Office Staff</option>
            </select>
          </div>
          <div className="form-field"><label className="form-label">Monthly salary (AED) *</label>
            <input className="form-input" type="number" value={form.monthly_salary} onChange={e => set('monthly_salary', e.target.value)} />
          </div>
          {form.category === 'Permanent Staff' && (
            <div className="form-field"><label className="form-label">Food allowance (AED)</label>
              <input className="form-input" type="number" value={form.food_allowance} onChange={e => set('food_allowance', e.target.value)} />
            </div>
          )}
          {form.category === 'Office Staff' && <>
            <div className="form-field"><label className="form-label">Housing allowance (AED)</label>
              <input className="form-input" type="number" value={form.housing_allowance} onChange={e => set('housing_allowance', e.target.value)} />
            </div>
            <div className="form-field"><label className="form-label">Transport allowance (AED)</label>
              <input className="form-input" type="number" value={form.transport_allowance} onChange={e => set('transport_allowance', e.target.value)} />
            </div>
          </>}
          <div className="form-field"><label className="form-label">Other allowance (AED)</label>
            <input className="form-input" type="number" value={form.other_allowance} onChange={e => set('other_allowance', e.target.value)} />
          </div>
          <div className="form-field"><label className="form-label">Expected joining date</label>
            <input className="form-input" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
          </div>
        </>}

        {track === 'contract_worker' && <>
          <div className="form-field"><label className="form-label">Hourly rate (AED) *</label>
            <input className="form-input" type="number" value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} />
          </div>
          <div className="form-field"><label className="form-label">Food allowance (AED)</label>
            <input className="form-input" type="number" value={form.food_allowance} onChange={e => set('food_allowance', e.target.value)} />
          </div>
          <div className="form-field"><label className="form-label">Other allowance (AED)</label>
            <input className="form-input" type="number" value={form.other_allowance} onChange={e => set('other_allowance', e.target.value)} />
          </div>
          <div className="form-field"><label className="form-label">Expected joining date</label>
            <input className="form-input" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
          </div>
        </>}

        {track === 'subcontractor_company_worker' && <>
          <div className="form-field"><label className="form-label">Supplier company *</label>
            <select className="form-select" value={form.supplier_id} onChange={e => setForm(f => ({...f, supplier_id: e.target.value, supplier_rate: ''}))}>
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label className="form-label">Agreed hourly rate (AED) *</label>
            <input className="form-input" type="number" value={form.supplier_rate} onChange={e => set('supplier_rate', e.target.value)} placeholder="Pre-fills from supplier rates when available" />
          </div>
          <div className="form-field"><label className="form-label">Expected site start date</label>
            <input className="form-input" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
          </div>
        </>}
      </div>
    </div>
  )
}

function ChecklistDrawer({ worker, docs, blockingStatus, onClose, onConvert }) {
  const tpl = getDocumentTemplate(worker)
  const track = TRACKS[worker.entry_track]
  return (
    <DrawerForm
      title={`Checklist — ${worker.full_name}`}
      subtitle={`${track?.label || ''} · ${worker.worker_number} · ${worker.trade_role}`}
      onClose={onClose}
      footer={
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,width:'100%'}}>
          <span style={{fontSize:12,color:'var(--muted)'}}>{blockingStatus.done} of {blockingStatus.total} blocking items complete</span>
          <button
            className="btn btn-teal"
            onClick={onConvert}
            disabled={!blockingStatus.allDone}
            style={!blockingStatus.allDone ? {opacity:0.5,cursor:'not-allowed'} : {}}>
            ✅ Convert to Active
          </button>
        </div>
      }>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {tpl.map(t => {
          const d = docs.find(x => x.doc_type === t.doc_type)
          const ok = d && (d.status === 'valid' || d.status === 'expiring_soon') && (!t.requires_highlight || d.highlighted_name_confirmed === true)
          return (
            <div key={t.doc_type} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:6,background:ok?'#f0fdf4':'#fff'}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:ok?'#16a34a':(t.is_blocking?'#fecaca':'#e2e8f0'),display:'flex',alignItems:'center',justifyContent:'center'}}>
                {ok ? <span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span> : t.is_blocking ? <span style={{color:'#dc2626',fontSize:10,fontWeight:700}}>!</span> : null}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{t.label}</div>
                {d?.expiry_date && <div style={{fontSize:11,color:'var(--hint)'}}>Expires {formatDate(d.expiry_date)}</div>}
                {t.requires_highlight && d && d.highlighted_name_confirmed !== true && (
                  <div style={{fontSize:11,color:'#dc2626'}}>Name highlight not confirmed</div>
                )}
              </div>
              {t.is_blocking && <span style={{fontSize:9,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'2px 6px',borderRadius:10}}>BLOCKING</span>}
              {!t.is_blocking && <span style={{fontSize:9,fontWeight:700,color:'#64748b',background:'#f1f5f9',padding:'2px 6px',borderRadius:10}}>OPTIONAL</span>}
              <span style={{fontSize:11,color:ok?'var(--success)':'var(--hint)',fontWeight:500,minWidth:60,textAlign:'right'}}>{ok ? 'On file' : (d?.status || 'missing')}</span>
            </div>
          )
        })}
        <div style={{fontSize:11,color:'var(--hint)',marginTop:6}}>
          Upload documents from the worker&rsquo;s profile (Documents tab). Come back here to convert once all blocking items are on file.
        </div>
      </div>
    </DrawerForm>
  )
}

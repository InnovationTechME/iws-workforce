'use client'
import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import DocumentUploadForm from '../../components/DocumentUploadForm'
import OnboardingDocSection from '../../components/onboarding/OnboardingDocSection'
import EIDMaskedInput, { isValidEID } from '../../components/onboarding/fields/EIDMaskedInput'
import HourlyRateField, { isValidHourlyRate, HOURLY_RATES } from '../../components/fields/HourlyRateField'
import { NATIONALITIES, POSITIONS } from '../../data/constants'
import { formatDate, passportExpiryGap } from '../../lib/utils'

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
    description: "Hourly workers engaged directly by Innovation Tech on their own visa. Simplified onboarding — Passport Copy, ID Copy (Emirates ID), Workmen's Compensation and Passport Visa Copy required. C3 card setup."
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

function emptyForm(track) {
  return {
    first_name: '', last_name: '', nationality: '',
    passport_number: '', passport_expiry: '',
    trade_role: '',
    category: track === 'direct_staff' ? 'Permanent Staff' : track === 'contract_worker' ? 'Contract Worker' : 'Subcontract Worker',
    monthly_salary: '', hourly_rate: '',
    food_allowance: '', housing_allowance: '', transport_allowance: '', other_allowance: '',
    joining_date: '',
    supplier_id: '', supplier_rate: '',
    email: '', whatsapp_number: '',
    emirates_id: '', emirates_id_expiry: '',
    visa_number: '', visa_expiry: '',
    health_insurance_provider: '', health_insurance_expiry: ''
  }
}

export default function OnboardingPageWrapper() {
  return <Suspense fallback={null}><OnboardingPage /></Suspense>
}

function OnboardingPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const trackSelectorRef = useRef(null)
  const [addMode, setAddMode] = useState(false)

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

  // ?add=1 — triggered by the /workers Add Worker button; highlights the track
  // selector so the user picks a track first. §5.3.5: no worker can exist
  // without an onboarding row, and direct-staff workers go through Offers.
  useEffect(() => {
    if (searchParams?.get('add') === '1') {
      setAddMode(true)
      setTimeout(() => {
        trackSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      router.replace('/onboarding')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
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
    // §5.3.5 — direct-staff workers must enter via an offer letter, not via a
    // direct onboarding form. Redirect to Offers with the create drawer open.
    if (selectedTrack === 'direct_staff') {
      router.push('/offers?new=1')
      return
    }
    setAddMode(false)
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
    else if (selectedTrack !== 'direct_staff') {
      // §5.3.6 — passport must be valid ≥7 months from the worker's joining date
      if (!form.joining_date) {
        errs.push('Joining date is required to validate passport expiry')
      } else {
        const gap = passportExpiryGap(form.passport_expiry, form.joining_date, 7)
        if (!gap.ok && gap.reason === 'too_soon') {
          errs.push(`Passport expires before the 7-month minimum from joining date (${formatDate(form.joining_date)}). Only ${gap.monthsFromJoining} months of validity at joining.`)
        }
      }
    }
    if (!form.trade_role) errs.push('Position / trade is required')
    if (selectedTrack === 'direct_staff') {
      if (!form.monthly_salary) errs.push('Monthly salary is required')
    }
    if (selectedTrack === 'contract_worker') {
      // §5.3.6 / §5.3.7 — fixed dropdown of integer rates 9..22.
      if (!form.hourly_rate) errs.push('Hourly rate is required')
      else if (!isValidHourlyRate(form.hourly_rate)) {
        errs.push(`Hourly rate must be one of ${HOURLY_RATES[0]}–${HOURLY_RATES[HOURLY_RATES.length - 1]} AED/hr`)
      }
    }
    if (selectedTrack === 'contract_worker' && form.joining_date) {
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 14)
      if (new Date(form.joining_date) > maxDate) {
        errs.push('Joining date cannot be more than 2 weeks from today for contract workers')
      }
    }
    if (selectedTrack === 'subcontractor_company_worker') {
      if (!form.supplier_id) errs.push('Supplier company is required')
      if (!form.supplier_rate) errs.push('Agreed hourly rate is required')
    }

    const today = new Date().toISOString().split('T')[0]
    if (!form.emirates_id?.trim()) errs.push('Emirates ID / National ID number is required')
    else if (!isValidEID(form.emirates_id)) errs.push('Emirates ID must match format 784-XXXX-XXXXXXX-X (15 digits, starting with 784)')
    if (!form.emirates_id_expiry) errs.push('Emirates ID / National ID expiry is required')
    else if (form.emirates_id_expiry <= today) errs.push('Emirates ID / National ID expiry must be a future date')
    if (!form.visa_number?.trim()) errs.push('UAE Visa number is required')
    if (!form.visa_expiry) errs.push('UAE Visa expiry is required')
    else if (form.visa_expiry <= today) errs.push('UAE Visa expiry must be a future date')
    if (form.health_insurance_expiry && form.health_insurance_expiry <= today) {
      errs.push('Health insurance expiry must be a future date')
    }
    return errs
  }

  const handleCreate = async () => {
    const errs = validate()
    if (errs.length) { setFormErrors(errs); return }
    if (blacklistHit) { setFormError('Passport is blacklisted — cannot onboard'); return }

    setSaving(true); setFormError(null)
    try {
      const workerNumber = await getNextWorkerNumber()
      const full_name = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
      const base = {
        worker_number: workerNumber,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        nationality: form.nationality,
        passport_number: form.passport_number.trim(),
        passport_expiry: form.passport_expiry || null,
        trade_role: form.trade_role,
        category: form.category,
        status: 'onboarding',
        entry_track: selectedTrack,
        joining_date: form.joining_date || null,
        email: form.email?.trim() || null,
        whatsapp_number: form.whatsapp_number?.trim() || null,
        emirates_id: form.emirates_id?.trim() || null,
        emirates_id_expiry: form.emirates_id_expiry || null,
        visa_number: form.visa_number?.trim() || null,
        visa_expiry: form.visa_expiry || null,
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
        // §5.3.7 — Contract Workers have no IT-provided health insurance.
        payload = {
          ...base,
          category: 'Contract Worker',
          hourly_rate: parseFloat(form.hourly_rate) || null,
          food_allowance: 0,
          other_allowance: 0,
          payment_method: 'Non-WPS',
        }
      } else {
        payload = {
          ...base,
          category: 'Subcontract Worker',
          subcontractor_type: 'invoice',
          supplier_id: form.supplier_id,
          supplier_rate: parseFloat(form.supplier_rate) || null,
          payment_method: 'Non-WPS',
          health_insurance_provider: form.health_insurance_provider?.trim() || null,
          health_insurance_expiry: form.health_insurance_expiry || null,
        }
      }

      let created
      try {
        const { data, error } = await supabase.from('workers').insert(payload).select().single()
        if (error) {
          console.error('=== INSERT ERROR ===')
          console.error('message:', error.message)
          console.error('details:', error.details)
          console.error('hint:', error.hint)
          console.error('code:', error.code)
          throw new Error(`${error.message} — ${error.details || ''} — hint: ${error.hint || ''}`)
        }
        created = data
      } catch(err) {
        console.error('CATCH:', err)
        setFormError(err.message)
        setSaving(false)
        return
      }
      if (!created) throw new Error('Failed to create worker — check unique constraints')

      // §5.3.5 — workers + onboarding must be atomic. If either side fails after
      // the workers row is created, roll back the workers row so we never leave
      // an orphan that violates the invariant.
      try {
        await initialiseWorkerDocuments(created, supabase)
        await upsertOnboarding(created.id, { created_at: new Date().toISOString() })
      } catch (err) {
        console.error('[onboarding] workers row created but onboarding insert failed; rolling back', { workerId: created.id, error: err })
        try { await supabase.from('workers').delete().eq('id', created.id) } catch (delErr) {
          console.error('[onboarding] rollback delete also failed — manual cleanup required', { workerId: created.id, delErr })
        }
        throw err
      }

      const docUpdates = []
      if (form.emirates_id_expiry) {
        docUpdates.push(supabase.from('documents').update({ expiry_date: form.emirates_id_expiry, updated_at: new Date().toISOString() }).eq('worker_id', created.id).eq('doc_type', 'emirates_id'))
      }
      if (form.visa_expiry) {
        docUpdates.push(supabase.from('documents').update({ expiry_date: form.visa_expiry, updated_at: new Date().toISOString() }).eq('worker_id', created.id).eq('doc_type', 'uae_visa'))
      }
      if (form.health_insurance_expiry) {
        docUpdates.push(supabase.from('documents').update({ expiry_date: form.health_insurance_expiry, updated_at: new Date().toISOString() }).eq('worker_id', created.id).eq('doc_type', 'health_insurance'))
      }
      if (docUpdates.length) await Promise.all(docUpdates)

      if (selectedTrack === 'contract_worker') {
        await supabase.from('tasks').insert([{
          worker_id: created.id,
          task_type: 'c3_card_setup',
          title: `Set up C3 card for ${full_name}`,
          status: 'open'
        }])
      }

      setToast(`${workerNumber} ${full_name} added to onboarding`)
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
    // Round C (§5.3.1 / §5.3.3): Labour Card is WARNING, not blocking — skip
    // it here. Medical Fitness requires medical_result='pass' (no file).
    // Emirates ID requires both front_file_url and back_file_url.
    const tpl = getDocumentTemplate(worker).filter(t => t.is_blocking && t.kind !== 'labour_card')
    const done = tpl.filter(t => {
      const d = docs.find(x => x.doc_type === t.doc_type)
      if (!d) return false
      if (t.kind === 'toggle' || t.doc_type === 'medical_fitness') return d.medical_result === 'pass'
      if (t.kind === 'emirates_id' || t.doc_type === 'emirates_id') {
        if (!d.front_file_url || !d.back_file_url) return false
        return d.status === 'valid' || d.status === 'expiring_soon'
      }
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
      setToast('Convert failed: ' + e.message)
      setTimeout(() => setToast(null), 4000)
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
      {addMode && !selectedTrack && (
        <div style={{background:'#ecfeff',border:'2px solid #0891b2',borderRadius:8,padding:'12px 16px',color:'#155e75',fontSize:13,marginBottom:12,fontWeight:500}}>
          Pick a track below to start onboarding. Direct Staff go through an offer letter; Contract Workers and Supplier Company Workers are created here.
        </div>
      )}

      <div ref={trackSelectorRef} style={{display:'flex',gap:14,marginBottom:16,padding:addMode && !selectedTrack ? 6 : 0,borderRadius:12,background:addMode && !selectedTrack ? 'rgba(8,145,178,0.08)' : 'transparent',transition:'background .2s'}}>
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
          onDocsUpdate={setWorkerDocs}
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
  // §5.3.6 — passport expiry must be ≥7 months from joining date (contract &
  // supplier tracks; direct_staff is validated on the Offers form and
  // redirected there before reaching this drawer).
  const passportGap = (form.passport_expiry && form.joining_date)
    ? passportExpiryGap(form.passport_expiry, form.joining_date, 7)
    : null
  const expiryWarn = passportGap && !passportGap.ok && passportGap.reason === 'too_soon'
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {track === 'direct_staff' && (
        <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#155e75'}}>
          Worker must have a signed offer letter before onboarding begins. The offer letter should be created first in the Offers section. Paid via WPS through a C3 card. Innovation Technologies provides health insurance; workmen&rsquo;s compensation is provided for site roles.
        </div>
      )}
      {track === 'contract_worker' && (
        <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#1e3a8a'}}>
          Contract workers are on Innovation Technologies payroll but paid Non-WPS through a C3 card. A C3 card setup task will be created automatically. No offer letter is issued. You must collect and upload Passport Copy, ID Copy (Emirates ID), Workmen&rsquo;s Compensation and Passport Visa Copy before the worker can be activated. Innovation Technologies provides workmen&rsquo;s compensation.
        </div>
      )}
      {track === 'subcontractor_company_worker' && (
        <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#334155'}}>
          This worker is employed by {suppliers.find(s => s.id === form.supplier_id)?.name || '[supplier name]'}, not by Innovation Technologies. They are on the supplier&rsquo;s payroll and will NOT appear in IT payroll; their hours feed monthly supplier invoicing. The supplier must provide all four of: passport copy, national ID / Emirates ID, health insurance, and workmen&rsquo;s compensation — all four are blocking for site activation.
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
          {expiryWarn && <div style={{fontSize:11,color:'var(--danger)',marginTop:4}}>⚠ Passport expires before the 7-month minimum from joining date. Only {passportGap.monthsFromJoining} months of validity at joining.</div>}
          {form.passport_expiry && !form.joining_date && track !== 'direct_staff' && <div style={{fontSize:11,color:'#b45309',marginTop:4}}>Enter joining date to validate passport expiry</div>}
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
          <HourlyRateField value={form.hourly_rate} onChange={v => set('hourly_rate', v)} required />
          <div className="form-field"><label className="form-label">Expected joining date</label>
            <input
              className="form-input"
              type="date"
              value={form.joining_date}
              onChange={e => set('joining_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              max={(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0] })()}
            />
            <div style={{fontSize:11,color:'var(--hint)',marginTop:4}}>Maximum 2 weeks from today</div>
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

      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5,marginTop:4}}>Contact</div>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Email address</label>
          <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="worker@example.com" />
        </div>
        <div className="form-field">
          <label className="form-label">WhatsApp number</label>
          <input className="form-input" type="tel" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+971 50 123 4567" />
        </div>
      </div>

      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5,marginTop:4}}>Document Details</div>
      <div className="form-grid">
        <EIDMaskedInput value={form.emirates_id} onChange={v => set('emirates_id', v)} required label="Emirates ID / National ID Number" />
        <div className="form-field">
          <label className="form-label">Emirates ID / National ID Expiry *</label>
          <input className="form-input" type="date" value={form.emirates_id_expiry} min={new Date(Date.now()+86400000).toISOString().split('T')[0]} onChange={e => set('emirates_id_expiry', e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">UAE Visa Number *</label>
          <input className="form-input" type="text" value={form.visa_number} onChange={e => set('visa_number', e.target.value)} placeholder="e.g. 101/2026/XXXXXXX" />
        </div>
        <div className="form-field">
          <label className="form-label">UAE Visa Expiry *</label>
          <input className="form-input" type="date" value={form.visa_expiry} min={new Date(Date.now()+86400000).toISOString().split('T')[0]} onChange={e => set('visa_expiry', e.target.value)} />
        </div>
        {track === 'subcontractor_company_worker' && <>
          <div className="form-field">
            <label className="form-label">Health Insurance Provider</label>
            <input className="form-input" type="text" value={form.health_insurance_provider} onChange={e => set('health_insurance_provider', e.target.value)} placeholder="e.g. AXA, Daman, Oman Insurance" />
          </div>
          <div className="form-field">
            <label className="form-label">Health Insurance Expiry</label>
            <input className="form-input" type="date" value={form.health_insurance_expiry} min={new Date(Date.now()+86400000).toISOString().split('T')[0]} onChange={e => set('health_insurance_expiry', e.target.value)} />
            {!form.health_insurance_expiry && <div style={{fontSize:11,color:'#b45309',marginTop:4}}>Adding insurance expiry enables automatic renewal alerts</div>}
          </div>
        </>}
      </div>
    </div>
  )
}

function ChecklistDrawer({ worker, docs, blockingStatus, onClose, onConvert, onDocsUpdate }) {
  const tpl = getDocumentTemplate(worker)
  const track = TRACKS[worker.entry_track]
  const [openUploadFor, setOpenUploadFor] = useState(null)

  const refreshDocs = async () => {
    const { data } = await supabase.from('documents').select('*').eq('worker_id', worker.id)
    onDocsUpdate(data || [])
  }

  const toggleUpload = (docType) => {
    setOpenUploadFor(prev => prev === docType ? null : docType)
  }

  const confirmHighlight = async (t, checked) => {
    const { error } = await supabase
      .from('documents')
      .update({ highlighted_name_confirmed: checked })
      .eq('worker_id', worker.id)
      .eq('doc_type', t.doc_type)
    if (!error) await refreshDocs()
  }

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
          const isToggle = t.kind === 'toggle' || t.doc_type === 'medical_fitness'
          const isEid = t.kind === 'emirates_id' || t.doc_type === 'emirates_id'
          let ok = false
          if (isToggle) ok = d?.medical_result === 'pass'
          else if (isEid) ok = !!(d && d.front_file_url && d.back_file_url && (d.status === 'valid' || d.status === 'expiring_soon'))
          else ok = !!(d && (d.status === 'valid' || d.status === 'expiring_soon') && (!t.requires_highlight || d.highlighted_name_confirmed === true))
          const hasEvidence = !!(d && (d.file_url || d.front_file_url || d.medical_result))
          const isMissing = !hasEvidence
          const tier = t.is_blocking ? 'BLOCKING' : (t.warning ? 'WARNING' : 'OPTIONAL')
          const isOpen = openUploadFor === t.doc_type
          const statusLabel = d?.medical_result === 'fail' ? 'FAIL' : (ok ? 'On file' : (d?.status || 'missing'))
          return (
            <div key={t.doc_type}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:6,background:ok?'#f0fdf4':'#fff',flexWrap:'wrap'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:ok?'#16a34a':(t.is_blocking?'#fecaca':'#e2e8f0'),display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {ok ? <span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span> : t.is_blocking ? <span style={{color:'#dc2626',fontSize:10,fontWeight:700}}>!</span> : null}
                </div>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontSize:13,fontWeight:500}}>{t.label}</div>
                  {d?.expiry_date && <div style={{fontSize:11,color:'var(--hint)'}}>Expires {formatDate(d.expiry_date)}</div>}
                  {t.requires_highlight && d && d.file_url && d.highlighted_name_confirmed !== true && (
                    <label style={{fontSize:11,color:'#dc2626',display:'flex',alignItems:'center',gap:4,marginTop:4,cursor:'pointer'}}>
                      <input type="checkbox" checked={false} onChange={e => confirmHighlight(t, e.target.checked)} />
                      Worker name is highlighted on this document
                    </label>
                  )}
                  {t.requires_highlight && d && d.highlighted_name_confirmed === true && (
                    <div style={{fontSize:11,color:'#16a34a',marginTop:4}}>✓ Name highlight confirmed</div>
                  )}
                  {t.note && <div style={{fontSize:11,color:'var(--hint)',fontStyle:'italic'}}>{t.note}</div>}
                </div>
                {tier === 'BLOCKING' && <span style={{fontSize:9,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'2px 6px',borderRadius:10}}>BLOCKING</span>}
                {tier === 'WARNING'  && <span style={{fontSize:9,fontWeight:700,color:'#92400e',background:'#fef3c7',padding:'2px 6px',borderRadius:10}}>WARNING</span>}
                {tier === 'OPTIONAL' && <span style={{fontSize:9,fontWeight:700,color:'#64748b',background:'#f1f5f9',padding:'2px 6px',borderRadius:10}}>OPTIONAL</span>}
                <span style={{fontSize:11,color:ok?'var(--success)':(d?.medical_result==='fail'?'#dc2626':'var(--hint)'),fontWeight:500,minWidth:50,textAlign:'right'}}>{statusLabel}</span>
                <button
                  type="button"
                  onClick={() => toggleUpload(t.doc_type)}
                  style={{cursor:'pointer',fontSize:11,fontWeight:600,color:isMissing?'#0d9488':'#64748b',background:isMissing?'#f0fdfa':'#f8fafc',border:`1px solid ${isMissing?'#99f6e4':'#e2e8f0'}`,padding:'4px 10px',borderRadius:6,whiteSpace:'nowrap'}}>
                  {isOpen ? '✕ Close' : isToggle ? (ok ? '↻ Re-record' : '➤ Record') : isMissing ? '↑ Upload' : '↻ Replace'}
                </button>
              </div>
              {isOpen && (
                <OnboardingDocSection
                  worker={worker}
                  template={t}
                  existing={d || null}
                  onCancel={() => setOpenUploadFor(null)}
                  onSaved={async () => { await refreshDocs(); setOpenUploadFor(null) }}
                />
              )}
            </div>
          )
        })}
        <div style={{fontSize:11,color:'var(--hint)',marginTop:6}}>
          Upload directly from this checklist. Full document details (expiry, notes) can still be edited on the worker profile Documents tab.
        </div>
      </div>
    </DrawerForm>
  )
}

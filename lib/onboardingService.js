import { supabase } from './supabaseClient'
import { uploadWorkerDocument } from './storageService'
import { ensureCurrentPositionRow } from './workExperienceService'

const flatten = (rows) => (rows || []).map(r => ({
  ...r,
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || ''
}))

// Workers currently in onboarding, joined with their onboarding row (if any)
export async function getOnboardingRecords() {
  const { data, error } = await supabase
    .from('workers')
    .select('*, onboarding(*)')
    .eq('status', 'onboarding')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(w => ({
    ...w,
    onboarding_row: Array.isArray(w.onboarding) ? w.onboarding[0] : w.onboarding
  }))
}

export async function getOnboardingByWorker(workerId) {
  const { data, error } = await supabase
    .from('onboarding')
    .select('*, worker:workers(full_name, worker_number)')
    .eq('worker_id', workerId)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null
  return flatten([data])[0]
}

// Upsert on worker_id
export async function upsertOnboarding(workerId, data) {
  const { data: existing, error: readErr } = await supabase
    .from('onboarding')
    .select('id')
    .eq('worker_id', workerId)
    .maybeSingle()
  if (readErr && readErr.code !== 'PGRST116') throw readErr

  if (existing) {
    const { data: row, error } = await supabase
      .from('onboarding')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return row
  } else {
    const { data: row, error } = await supabase
      .from('onboarding')
      .insert([{ worker_id: workerId, ...data }])
      .select()
      .single()
    if (error) throw error
    return row
  }
}

// ─── Round C — onboarding doc save helpers ──────────────────────────────

// Columns on `workers` that mirror document metadata. Written as a
// denormalised cache when a document is saved; authoritative home for all
// this data is `public.documents`.
// Wipe-guard rule: only write non-empty values. A partial save (e.g.
// expiry-only re-upload that leaves the number blank) must never
// overwrite a populated workers field with null/empty. Same policy as
// documentService.workerWriteBackFor.
function denormalisedWorkerUpdates(docType, payload) {
  const upd = {}
  const nonEmpty = v => v != null && v !== ''
  if (docType === 'passport_copy') {
    if (nonEmpty(payload.passport_number)) upd.passport_number = payload.passport_number
    if (payload.expiry_date)               upd.passport_expiry = payload.expiry_date
  }
  if (docType === 'emirates_id') {
    if (nonEmpty(payload.eid_number))      upd.emirates_id = payload.eid_number
    if (payload.expiry_date)               upd.emirates_id_expiry = payload.expiry_date
  }
  if (docType === 'uae_visa') {
    if (nonEmpty(payload.visa_number))     upd.visa_number = payload.visa_number
    if (payload.expiry_date)               upd.visa_expiry = payload.expiry_date
  }
  if (docType === 'health_insurance') {
    if (nonEmpty(payload.provider))        upd.health_insurance_provider = payload.provider
    if (payload.expiry_date)               upd.health_insurance_expiry = payload.expiry_date
  }
  if (docType === 'workmen_compensation') {
    if (nonEmpty(payload.provider))         upd.workmen_comp_provider = payload.provider
    if (nonEmpty(payload.policy_reference)) upd.workmen_comp_policy_ref = payload.policy_reference
    if (payload.expiry_date)                upd.workmen_comp_expiry = payload.expiry_date
  }
  return upd
}

// Shared save path for every per-doc-type onboarding form.
// `files` may be a single File (single-PDF / image) OR an array of Files
// (passport-copy multi-image mode). Emirates ID uses `front_file` +
// `back_file` instead. Medical Fitness uses setMedicalFitness* below.
export async function saveOnboardingDoc(worker, docType, payload = {}) {
  const {
    files, front_file, back_file,
    expiry_date, issue_date, notes,
    passport_number, issuing_country,
    visa_number, visa_type, issuing_emirate, sponsor,
    eid_number,
    policy_number, policy_reference, provider, coverage_type,
    highlighted_name_confirmed,
    ref,                     // human-readable reference for file naming
    label, is_blocking,
  } = payload

  let file_url = null
  let front_file_url = null
  let back_file_url = null

  if (docType === 'emirates_id') {
    if (front_file) {
      const { path, bucket } = await uploadWorkerDocument(worker, docType, front_file, `${ref || eid_number || ''}_front`)
      front_file_url = `${bucket}::${path}`
    }
    if (back_file) {
      const { path, bucket } = await uploadWorkerDocument(worker, docType, back_file, `${ref || eid_number || ''}_back`)
      back_file_url = `${bucket}::${path}`
    }
    // `file_url` mirrors `front_file_url` so existing single-URL consumers
    // (Documents tab View button) still work.
    file_url = front_file_url || back_file_url || null
  } else if (Array.isArray(files)) {
    const refs = []
    for (let i = 0; i < files.length; i++) {
      const { path, bucket } = await uploadWorkerDocument(worker, docType, files[i], `${ref || ''}_p${i + 1}`)
      refs.push(`${bucket}::${path}`)
    }
    if (refs.length === 1) file_url = refs[0]
    else if (refs.length > 1) file_url = JSON.stringify(refs)
  } else if (files) {
    const { path, bucket } = await uploadWorkerDocument(worker, docType, files, ref)
    file_url = `${bucket}::${path}`
  }

  const hasEvidence = !!(file_url || front_file_url || back_file_url)
  const status = hasEvidence ? 'valid' : 'missing'

  const row = {
    worker_id: worker.id,
    doc_type: docType,
    label: label || null,
    is_blocking: is_blocking !== undefined ? is_blocking : null,
    file_url,
    front_file_url,
    back_file_url,
    issue_date: issue_date || null,
    expiry_date: expiry_date || null,
    notes: notes || null,
    uploaded_at: hasEvidence ? new Date().toISOString() : null,
    passport_number: passport_number || null,
    issuing_country: issuing_country || null,
    visa_number: visa_number || null,
    visa_type: visa_type || null,
    issuing_emirate: issuing_emirate || null,
    sponsor: sponsor || null,
    eid_number: eid_number || null,
    policy_number: policy_number || null,
    policy_reference: policy_reference || null,
    provider: provider || null,
    coverage_type: coverage_type || null,
    highlighted_name_confirmed: docType === 'workmen_compensation' ? (highlighted_name_confirmed || false) : null,
    doc_subtype: docType === 'workmen_compensation' ? 'highlighted_page' : null,
    status,
    updated_at: new Date().toISOString(),
  }
  // Null-strip keys the DB column may not yet exist for is unnecessary —
  // migration 003 must be applied before this code ships.
  const { error } = await supabase
    .from('documents')
    .upsert(row, { onConflict: 'worker_id,doc_type' })
  if (error) throw new Error(error.message)

  const workerUpdates = denormalisedWorkerUpdates(docType, { ...payload })
  if (Object.keys(workerUpdates).length) {
    await supabase.from('workers').update(workerUpdates).eq('id', worker.id)
  }
}

// Medical Fitness Pass — tick the checklist item, no file, no flag flip.
export async function setMedicalFitnessPass(worker) {
  const { error } = await supabase.from('documents').upsert({
    worker_id: worker.id,
    doc_type: 'medical_fitness',
    label: 'Medical Fitness',
    is_blocking: true,
    medical_result: 'pass',
    status: 'valid',
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'worker_id,doc_type' })
  if (error) throw new Error(error.message)
}

// Medical Fitness Fail — per CLAUDE.md §5.3.4:
//   - documents.medical_result = 'fail'
//   - workers.medical_failed = true, workers.status = 'inactive'
//   - HR Inbox task for Ops (best-effort; status flip persists even if insert fails)
//   - DO NOT auto-create a blacklist entry.
export async function setMedicalFitnessFail(worker) {
  const now = new Date().toISOString()
  const { error: dErr } = await supabase.from('documents').upsert({
    worker_id: worker.id,
    doc_type: 'medical_fitness',
    label: 'Medical Fitness',
    is_blocking: true,
    medical_result: 'fail',
    status: 'valid',
    uploaded_at: now,
    updated_at: now,
  }, { onConflict: 'worker_id,doc_type' })
  if (dErr) throw new Error(dErr.message)

  const { error: wErr } = await supabase
    .from('workers')
    .update({ medical_failed: true, status: 'inactive' })
    .eq('id', worker.id)
  if (wErr) throw new Error(wErr.message)

  try {
    await supabase.from('tasks').insert({
      worker_id: worker.id,
      task_type: 'medical_fail_review',
      title: `Medical fitness fail for ${worker.full_name}`,
      description: 'Review and decide on visa cancellation / blacklist / refund eligibility.',
      status: 'open',
      assigned_to: 'ops',
    })
  } catch (e) {
    console.error('medical_fail_review task insert failed (status flip persisted):', e?.message || e)
  }
}

// Convert-to-Active blocking-doc validator.
// Returns [] when every blocking item has evidence, or an array of labels
// that are missing evidence. Labour Card (warning tier) is NOT included.
export function validateBlockingDocs(docs) {
  const missing = []
  const by = Object.fromEntries((docs || []).map(d => [d.doc_type, d]))
  const needFile = ['passport_copy', 'passport_photo', 'uae_visa', 'health_insurance', 'workmen_compensation']
  for (const t of needFile) {
    const d = by[t]
    if (!d || !d.is_blocking) continue
    if (!d.file_url) missing.push(t)
  }
  const eid = by['emirates_id']
  if (eid && eid.is_blocking && (!eid.front_file_url || !eid.back_file_url)) missing.push('emirates_id')
  const wc = by['workmen_compensation']
  if (wc && wc.is_blocking && wc.file_url && !wc.highlighted_name_confirmed) missing.push('workmen_compensation_highlight')
  const med = by['medical_fitness']
  if (med && med.is_blocking && med.medical_result !== 'pass') missing.push('medical_fitness')
  return missing
}

// Mark onboarding complete and flip worker status to active.
// Round C (§5.3.3): also validate blocking docs and stamp uploaded_at on any
// blocking row that somehow lacks it. Never deletes or duplicates documents.
export async function completeOnboarding(workerId) {
  const now = new Date().toISOString()

  const { data: docs, error: dErr } = await supabase
    .from('documents').select('*').eq('worker_id', workerId)
  if (dErr) throw dErr

  const missing = validateBlockingDocs(docs || [])
  if (missing.length) {
    throw new Error('Cannot convert to Active — missing evidence: ' + missing.join(', '))
  }

  const toStamp = (docs || []).filter(d => d.is_blocking && !d.uploaded_at && d.file_url)
  if (toStamp.length) {
    await supabase.from('documents')
      .update({ uploaded_at: now })
      .in('id', toStamp.map(d => d.id))
  }

  const { error: obErr } = await supabase
    .from('onboarding')
    .update({ completed_at: now })
    .eq('worker_id', workerId)
  if (obErr) throw obErr
  const { data: updatedWorker, error: wErr } = await supabase
    .from('workers')
    .update({ status: 'active' })
    .eq('id', workerId)
    .select()
    .single()
  if (wErr) throw wErr

  // §5.3.8 — system-created current-position row, idempotent.
  try { await ensureCurrentPositionRow(updatedWorker) }
  catch (e) { console.error('ensureCurrentPositionRow failed (status flip persisted):', e?.message || e) }

  return { success: true, completed_at: now }
}

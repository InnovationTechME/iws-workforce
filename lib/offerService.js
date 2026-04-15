import { supabase } from './supabaseClient'
import { addWorker, getNextWorkerNumber } from './workerService'
import { initialiseWorkerDocuments } from './documentRegister'
import { upsertOnboarding } from './onboardingService'

export async function getOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getOfferById(id) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function addOffer(formData) {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
  const seq = String((count || 0) + 1).padStart(4, '0')
  const ref_number = `IT-OL-${year}-${seq}`

  const payload = {
    ref_number,
    full_name: `${(formData.first_name || '').trim()} ${(formData.last_name || '').trim()}`.trim(),
    nationality: formData.nationality || null,
    date_of_birth: formData.date_of_birth || null,
    passport_number: formData.passport_number || null,
    trade_role: formData.trade_role || formData.position || '',
    category: formData.category || 'Permanent Staff',
    monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : null,
    hourly_rate: null,
    housing_allowance: parseFloat(formData.housing_allowance || 0),
    transport_allowance: parseFloat(formData.transport_allowance || 0),
    food_allowance: parseFloat(formData.food_allowance || 0),
    joining_date: formData.joining_date || formData.start_date || null,
    valid_until: formData.valid_until || null,
    status: 'draft'
  }

  console.log('Inserting offer payload:', payload)

  const { data, error } = await supabase
    .from('offers')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('addOffer error:', error.message, error.details, error.hint)
    throw new Error(error.message)
  }
  return data
}

export async function updateOffer(id, updates) {
  const { data: row, error } = await supabase
    .from('offers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

export async function getOfferByWorker(workerId) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

function parseFullName(full) {
  const parts = (full || '').trim().split(/\s+/)
  if (parts.length === 0) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

function ddmmyyyy(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}${mm}${d.getFullYear()}`
}

// Uploads the signed offer PDF and returns a storage reference "bucket::path".
// Uses the existing `letter-archive` bucket because the worker does not yet
// exist at accept time.
async function uploadSignedOffer(offer, file) {
  const bucket = 'letter-archive'
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
  const path = `offers/${offer.ref_number}/signed_${ddmmyyyy(new Date())}.${ext}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' })
  if (error) throw new Error(`Signed-offer upload failed: ${error.message}`)
  return `${bucket}::${path}`
}

// Accepts an offer:
//   1. Uploads the signed-offer PDF to storage.
//   2. Creates a `workers` row with status='onboarding' (if not already).
//   3. Seeds the per-track document register.
//   4. Creates the `onboarding` row linked to the offer.
//   5. Writes back status='accepted', worker_id, signed_offer_url, decided_*.
// Idempotent on offers.worker_id: re-running on an already-accepted offer
// returns the existing worker without duplicating inserts.
export async function acceptOffer(offerId, file, { decidedBy } = {}) {
  if (!file) throw new Error('Signed offer file is required to accept')
  const offer = await getOfferById(offerId)
  if (!offer) throw new Error('Offer not found')
  if (offer.status === 'rejected' || offer.status === 'rescinded') {
    throw new Error(`Cannot accept an offer in status '${offer.status}'`)
  }

  // Idempotency: if worker already exists for this offer, just refresh the
  // signed-offer URL (re-upload allowed) and return.
  if (offer.worker_id) {
    const signedRef = await uploadSignedOffer(offer, file)
    await updateOffer(offerId, {
      status: 'accepted',
      signed_offer_url: signedRef,
      decided_at: new Date().toISOString(),
      decided_by: decidedBy || null,
    })
    return { worker_id: offer.worker_id, reused: true }
  }

  // 1. Upload first — failure here must not leave partial DB state.
  const signedRef = await uploadSignedOffer(offer, file)

  // 2. Create worker. Offers are restricted to direct staff (see offers page
  // banner and category CHECK), so entry_track is hard-coded.
  const { first_name, last_name } = parseFullName(offer.full_name)
  const worker_number = await getNextWorkerNumber()
  const workerPayload = {
    worker_number,
    first_name,
    last_name,
    nationality: offer.nationality || null,
    date_of_birth: offer.date_of_birth || null,
    passport_number: offer.passport_number || null,
    passport_expiry: offer.passport_expiry || null,
    trade_role: offer.trade_role,
    category: offer.category || 'Permanent Staff',
    status: 'onboarding',
    entry_track: 'direct_staff',
    monthly_salary: offer.monthly_salary ?? null,
    housing_allowance: offer.housing_allowance ?? 0,
    transport_allowance: offer.transport_allowance ?? 0,
    food_allowance: offer.food_allowance ?? 0,
    joining_date: offer.joining_date || null,
    payment_method: 'WPS',
  }
  const created = await addWorker(workerPayload)
  if (!created) throw new Error('Failed to create worker from offer')

  // 3. Seed documents for the new worker based on their track template.
  try { await initialiseWorkerDocuments(created, supabase) } catch (e) { console.error('initialiseWorkerDocuments:', e) }

  // 3b. Back-link the signed offer PDF as the worker's `offer_letter`
  // documents row so the onboarding checklist item #1 shows "on file".
  // Informational (is_blocking=false) per CLAUDE.md §5.3.1.
  try {
    await supabase.from('documents').upsert({
      worker_id: created.id,
      doc_type: 'offer_letter',
      label: 'Offer Letter (signed)',
      file_url: signedRef,
      status: 'valid',
      is_blocking: false,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'worker_id,doc_type' })
  } catch (e) { console.error('offer_letter back-link failed:', e?.message || e) }

  // 4. Create the onboarding row, linked back to the offer.
  try {
    await upsertOnboarding(created.id, {
      offer_id: offerId,
      created_at: new Date().toISOString(),
    })
  } catch (e) { console.error('upsertOnboarding:', e) }

  // 5. Write back to the offer. This is last so that a failure earlier does
  // not leave the offer marked accepted with no worker.
  await updateOffer(offerId, {
    status: 'accepted',
    worker_id: created.id,
    signed_offer_url: signedRef,
    decided_at: new Date().toISOString(),
    decided_by: decidedBy || null,
  })

  return { worker_id: created.id, reused: false }
}

// Rejects an offer. No file upload, no worker creation, no onboarding row.
export async function rejectOffer(offerId, { decidedBy, reason } = {}) {
  const offer = await getOfferById(offerId)
  if (!offer) throw new Error('Offer not found')
  if (offer.worker_id) {
    throw new Error('Cannot reject: this offer has already been accepted and a worker exists')
  }
  return updateOffer(offerId, {
    status: 'rejected',
    decided_at: new Date().toISOString(),
    decided_by: decidedBy || null,
    notes: reason || offer.notes || null,
  })
}

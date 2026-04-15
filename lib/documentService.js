import { supabase } from './supabaseClient'

// All documents for a worker, ordered by doc_type
export async function getDocumentsByWorker(workerId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('worker_id', workerId)
    .order('doc_type', { ascending: true })
  if (error) throw error
  return data || []
}

// Identity fields on `workers` that are denormalised copies of document
// metadata. Whenever a document row is upserted we mirror the relevant
// columns back onto workers so downstream consumers (cover page, pack
// builder, worker profile hero) see the latest values. Never overwrite
// a populated workers field with a null from the doc form — callers may
// save partial updates, and the workers row is authoritative until the
// doc form explicitly replaces the value.
function workerWriteBackFor(docType, data) {
  const upd = {}
  if (docType === 'passport_copy') {
    if (data.passport_number != null && data.passport_number !== '') upd.passport_number = data.passport_number
    if (data.expiry_date) upd.passport_expiry = data.expiry_date
  } else if (docType === 'emirates_id') {
    if (data.eid_number != null && data.eid_number !== '') upd.emirates_id = data.eid_number
    if (data.expiry_date) upd.emirates_id_expiry = data.expiry_date
  } else if (docType === 'uae_visa') {
    if (data.visa_number != null && data.visa_number !== '') upd.visa_number = data.visa_number
    if (data.expiry_date) upd.visa_expiry = data.expiry_date
  }
  return upd
}

// Insert or update document — matched on worker_id + doc_type.
// Also mirrors identity fields onto the workers row (see
// workerWriteBackFor) so the profile hero / cover page stay in sync.
export async function upsertDocument(workerId, docType, data) {
  const { data: existing, error: readErr } = await supabase
    .from('documents')
    .select('id')
    .eq('worker_id', workerId)
    .eq('doc_type', docType)
    .maybeSingle()
  if (readErr && readErr.code !== 'PGRST116') throw readErr

  let row
  if (existing) {
    const { data: updated, error } = await supabase
      .from('documents')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    row = updated
  } else {
    const { data: inserted, error } = await supabase
      .from('documents')
      .insert([{ worker_id: workerId, doc_type: docType, ...data }])
      .select()
      .single()
    if (error) throw error
    row = inserted
  }

  const writeBack = workerWriteBackFor(docType, data)
  if (Object.keys(writeBack).length) {
    const { error: wErr } = await supabase
      .from('workers')
      .update(writeBack)
      .eq('id', workerId)
    if (wErr) console.error('upsertDocument worker write-back failed:', wErr.message)
  }

  return row
}

export async function updateDocumentStatus(id, status) {
  const { data: row, error } = await supabase
    .from('documents')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// Documents expiring within N days (any worker), excluding already-missing rows
export async function getExpiringDocuments(daysAhead) {
  const today = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + (daysAhead || 30))
  const todayStr = today.toISOString().split('T')[0]
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .neq('status', 'missing')
    .gte('expiry_date', todayStr)
    .lte('expiry_date', cutoffStr)
    .order('expiry_date', { ascending: true })
  if (error) throw error
  return data || []
}

// Insurance / WC expiry alerts — amber ≤ 30d, red = past
export async function getInsuranceExpiryAlerts() {
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('workers')
    .select('id, worker_number, full_name, trade_role, entry_track, health_insurance_expiry, workmen_comp_expiry')
    .or(`health_insurance_expiry.lte.${in30},workmen_comp_expiry.lte.${in30}`)
    .neq('status', 'inactive')
  if (error) {
    console.error('getInsuranceExpiryAlerts error:', error)
    return []
  }

  const alerts = []
  for (const w of data || []) {
    if (w.health_insurance_expiry) {
      const expired = w.health_insurance_expiry < today
      const expiring = w.health_insurance_expiry <= in30
      if (expired || expiring) {
        alerts.push({
          worker_id: w.id,
          worker_number: w.worker_number,
          full_name: w.full_name,
          trade_role: w.trade_role,
          doc_type: 'Health Insurance',
          expiry_date: w.health_insurance_expiry,
          severity: expired ? 'red' : 'amber',
          pack_blocked: false,
          message: expired
            ? `Health insurance EXPIRED on ${w.health_insurance_expiry} — renew to restore compliance`
            : `Health insurance expires ${w.health_insurance_expiry} — renew within 30 days`
        })
      }
    }
    if (w.workmen_comp_expiry) {
      const expired = w.workmen_comp_expiry < today
      const expiring = w.workmen_comp_expiry <= in30
      if (expired || expiring) {
        alerts.push({
          worker_id: w.id,
          worker_number: w.worker_number,
          full_name: w.full_name,
          trade_role: w.trade_role,
          doc_type: "Workmen's Compensation",
          expiry_date: w.workmen_comp_expiry,
          severity: expired ? 'red' : 'amber',
          pack_blocked: expired,
          message: expired
            ? `WC certificate EXPIRED on ${w.workmen_comp_expiry} — document pack blocked`
            : `WC certificate expires ${w.workmen_comp_expiry} — renew within 30 days`
        })
      }
    }
  }
  return alerts
}

// All docs across all non-inactive workers, joined with worker details
export async function getAllDocumentsWithWorkers() {
  const { data, error } = await supabase
    .from('documents')
    .select('*, workers(id, worker_number, full_name, entry_track, category, status)')
    .order('created_at', { ascending: false })
  if (error) { console.error('getAllDocumentsWithWorkers error:', error); return [] }
  return (data || []).filter(d => d.workers && d.workers.status !== 'inactive')
}

// Blocking docs still missing for a worker
export async function getMissingBlockingDocuments(workerId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('worker_id', workerId)
    .eq('is_blocking', true)
    .eq('status', 'missing')
  if (error) throw error
  return data || []
}

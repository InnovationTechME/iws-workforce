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

// Insert or update document — matched on worker_id + doc_type
export async function upsertDocument(workerId, docType, data) {
  const { data: existing, error: readErr } = await supabase
    .from('documents')
    .select('id')
    .eq('worker_id', workerId)
    .eq('doc_type', docType)
    .maybeSingle()
  if (readErr && readErr.code !== 'PGRST116') throw readErr

  if (existing) {
    const { data: row, error } = await supabase
      .from('documents')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return row
  } else {
    const { data: row, error } = await supabase
      .from('documents')
      .insert([{ worker_id: workerId, doc_type: docType, ...data }])
      .select()
      .single()
    if (error) throw error
    return row
  }
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

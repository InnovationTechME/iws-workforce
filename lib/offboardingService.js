import { supabase } from './supabaseClient'

export const OFFBOARDING_ITEMS = [
  { key: 'medical_insurance_cancelled', label: 'Medical insurance cancelled', required: true },
  { key: 'c3_card_cancelled', label: 'C3 card cancelled', required: true },
  { key: 'final_payslip_issued', label: 'Final payslip issued', required: true },
  { key: 'eos_approved', label: 'End-of-service approved', required: true },
  { key: 'exit_clearance_signed', label: 'Exit clearance signed', required: true },
  { key: 'visa_cancellation_initiated', label: 'Visa cancellation initiated', required: true },
  { key: 'labour_card_cancelled', label: 'Labour card cancelled', required: true },
]

const REQUIRED_CHECKLIST = OFFBOARDING_ITEMS.filter(item => item.required).map(item => item.key)

const flatten = (rows) => (rows || []).map(r => ({
  ...r,
  status: r.file_closed_at ? 'closed' : 'in_progress',
  checklist: Object.fromEntries(OFFBOARDING_ITEMS.map(item => [
    item.key,
    { done: r[item.key] === true, done_by: '', done_at: null },
  ])),
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || '',
  worker: r.worker || null,
}))

export async function getOffboardingRecords() {
  const { data, error } = await supabase
    .from('offboarding')
    .select('*, worker:workers(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return flatten(data)
}

export async function getOffboardingByWorker(workerId) {
  const { data, error } = await supabase
    .from('offboarding')
    .select('*, worker:workers(*)')
    .eq('worker_id', workerId)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null
  return flatten([data])[0]
}

// Insert new offboarding + flip worker status
export async function startOffboarding(workerId, data) {
  const { data: row, error } = await supabase
    .from('offboarding')
    .insert([{ worker_id: workerId, reason: data.reason, last_working_date: data.last_working_date }])
    .select()
    .single()
  if (error) throw error
  const { error: wErr } = await supabase
    .from('workers')
    .update({ status: 'offboarding' })
    .eq('id', workerId)
  if (wErr) throw wErr
  return row
}

export async function updateOffboarding(id, updates) {
  const { data: row, error } = await supabase
    .from('offboarding')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

export function canCloseOffboardingRecord(record) {
  const missing = REQUIRED_CHECKLIST.filter(k => record?.[k] !== true)
  return { can: missing.length === 0, missing }
}

// Close worker file — only if all 7 checklist items true
export async function closeWorkerFile(workerId, offboardingId) {
  const { data: current, error: readErr } = await supabase
    .from('offboarding')
    .select('*')
    .eq('id', offboardingId)
    .single()
  if (readErr) throw readErr

  const missing = REQUIRED_CHECKLIST.filter(k => current[k] !== true)
  if (missing.length > 0) {
    return { success: false, missing }
  }

  const now = new Date().toISOString()
  const { error: obErr } = await supabase
    .from('offboarding')
    .update({ file_closed_at: now })
    .eq('id', offboardingId)
  if (obErr) throw obErr

  const { error: wErr } = await supabase
    .from('workers')
    .update({ status: 'inactive' })
    .eq('id', workerId)
  if (wErr) throw wErr

  return { success: true, file_closed_at: now }
}

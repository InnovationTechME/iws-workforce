import { supabase } from './supabaseClient'

const REQUIRED_CHECKLIST = [
  'medical_insurance_cancelled',
  'c3_card_cancelled',
  'final_payslip_issued',
  'eos_approved',
  'exit_clearance_signed',
  'visa_cancellation_initiated',
  'labour_card_cancelled'
]

const flatten = (rows) => (rows || []).map(r => ({
  ...r,
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || ''
}))

export async function getOffboardingRecords() {
  const { data, error } = await supabase
    .from('offboarding')
    .select('*, worker:workers(full_name, worker_number)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return flatten(data)
}

export async function getOffboardingByWorker(workerId) {
  const { data, error } = await supabase
    .from('offboarding')
    .select('*, worker:workers(full_name, worker_number)')
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
    .insert([{ worker_id: workerId, ...data }])
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

import { supabase } from './supabaseClient'

const flatten = (rows) => (rows || []).map(r => ({
  ...r,
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || ''
}))

export async function getOnboardingRecords() {
  const { data, error } = await supabase
    .from('onboarding')
    .select('*, worker:workers(full_name, worker_number)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return flatten(data)
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

// Mark onboarding complete and flip worker status to active
export async function completeOnboarding(workerId) {
  const now = new Date().toISOString()
  const { error: obErr } = await supabase
    .from('onboarding')
    .update({ completed_at: now })
    .eq('worker_id', workerId)
  if (obErr) throw obErr
  const { error: wErr } = await supabase
    .from('workers')
    .update({ status: 'active' })
    .eq('id', workerId)
  if (wErr) throw wErr
  return { success: true, completed_at: now }
}

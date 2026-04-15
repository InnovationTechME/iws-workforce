import { supabase } from './supabaseClient'

// §5.3.8 — Work Experience rows on a worker.
// The system-created current-position row (company = Innovation Technologies
// LLC O.P.C., is_current=true, system_created=true) is inserted on
// Convert-to-Active. The worker-pack renderer already hardcodes a
// "current position" row from worker.trade_role + worker.joining_date
// (lib/coverPageTemplate.js + app/packs/page.js), so the system row must
// NEVER leak into the pack — otherwise Innovation Tech would render twice.
//
// Use listWorkExperience() for the profile UI (HR needs to see the
// protected current row). Use listPastExperience() for the pack
// generator — it excludes is_current rows.

export async function listWorkExperience(workerId) {
  const { data, error } = await supabase
    .from('work_experience')
    .select('*')
    .eq('worker_id', workerId)
    .order('is_current', { ascending: false })
    .order('from_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data || []
}

export async function listPastExperience(workerId) {
  const { data, error } = await supabase
    .from('work_experience')
    .select('*')
    .eq('worker_id', workerId)
    .eq('is_current', false)
    .order('from_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data || []
}

export async function addPastExperience(workerId, { company_name, position, from_date, to_date }) {
  if (!company_name?.trim()) throw new Error('Company name is required')
  const row = {
    worker_id: workerId,
    company_name: company_name.trim(),
    position: position?.trim() || null,
    from_date: from_date || null,
    to_date: to_date || null,
    is_current: false,
    system_created: false,
  }
  const { data, error } = await supabase
    .from('work_experience')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePastExperience(id, updates) {
  // Defence in depth: the server-side guard below prevents editing a
  // system-created row regardless of what the UI sends.
  const payload = {
    company_name: updates.company_name?.trim() || undefined,
    position: updates.position !== undefined ? (updates.position?.trim() || null) : undefined,
    from_date: updates.from_date !== undefined ? (updates.from_date || null) : undefined,
    to_date: updates.to_date !== undefined ? (updates.to_date || null) : undefined,
    updated_at: new Date().toISOString(),
  }
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
  const { data, error } = await supabase
    .from('work_experience')
    .update(payload)
    .eq('id', id)
    .eq('system_created', false)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePastExperience(id) {
  // Server-side guard — the system-created current-position row must never
  // be deletable, even if the UI were bypassed.
  const { error } = await supabase
    .from('work_experience')
    .delete()
    .eq('id', id)
    .eq('system_created', false)
  if (error) throw error
}

// Called from completeOnboarding when a worker is converted to Active.
// Idempotent: the UNIQUE INDEX work_experience_one_current_per_worker
// enforces one current row; we check first so re-runs don't throw.
export async function ensureCurrentPositionRow(worker) {
  const { data: existing } = await supabase
    .from('work_experience')
    .select('id')
    .eq('worker_id', worker.id)
    .eq('is_current', true)
    .maybeSingle()
  if (existing) return existing

  const fromDate = worker.joining_date
    || (worker.created_at ? String(worker.created_at).slice(0, 10) : null)

  const { data, error } = await supabase
    .from('work_experience')
    .insert({
      worker_id: worker.id,
      company_name: 'Innovation Technologies LLC O.P.C.',
      position: worker.trade_role || null,
      from_date: fromDate,
      to_date: null,
      is_current: true,
      system_created: true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

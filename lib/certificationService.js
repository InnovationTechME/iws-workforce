import { supabase } from './supabaseClient'

export async function getCertificationsByWorker(workerId) {
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('worker_id', workerId)
    .order('cert_type', { ascending: true })
  if (error) throw error
  return data || []
}

export async function upsertCertification(workerId, certType, data) {
  const { data: existing, error: readErr } = await supabase
    .from('certifications')
    .select('id')
    .eq('worker_id', workerId)
    .eq('cert_type', certType)
    .maybeSingle()
  if (readErr && readErr.code !== 'PGRST116') throw readErr

  if (existing) {
    const { data: row, error } = await supabase
      .from('certifications')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return row
  } else {
    const { data: row, error } = await supabase
      .from('certifications')
      .insert([{ worker_id: workerId, cert_type: certType, ...data }])
      .select()
      .single()
    if (error) throw error
    return row
  }
}

export async function getExpiringCertifications(daysAhead) {
  const today = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + (daysAhead || 30))
  const todayStr = today.toISOString().split('T')[0]
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .gte('expiry_date', todayStr)
    .lte('expiry_date', cutoffStr)
    .order('expiry_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateCertificationStatus(id, status) {
  const { data: row, error } = await supabase
    .from('certifications')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

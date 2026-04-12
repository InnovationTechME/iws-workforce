import { supabase } from './supabaseClient'

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

// Insert a new offer with an auto-generated ref IT-OL-YYYY-XXXX
export async function addOffer(data) {
  const { count, error: countErr } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
  if (countErr) throw countErr
  const year = new Date().getFullYear()
  const seq = String((count || 0) + 1).padStart(4, '0')
  const ref_number = `IT-OL-${year}-${seq}`
  const payload = { ref_number, ...data }
  const { data: row, error } = await supabase
    .from('offers')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return row
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

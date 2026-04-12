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

import { supabase } from './supabaseClient'

export async function getBlacklist() {
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Returns the matching blacklist entry or null
export async function checkBlacklist(passportNumber) {
  if (!passportNumber) return null
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .ilike('passport_number', passportNumber)
    .limit(1)
  if (error) throw error
  return (data && data[0]) || null
}

export async function addToBlacklist(data) {
  const { data: row, error } = await supabase
    .from('blacklist')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function removeFromBlacklist(id) {
  const { error } = await supabase
    .from('blacklist')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

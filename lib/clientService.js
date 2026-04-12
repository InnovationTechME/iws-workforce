import { supabase } from './supabaseClient'

// Return all active clients ordered by name
export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getClientById(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function addClient(data) {
  const { data: row, error } = await supabase
    .from('clients')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function updateClient(id, updates) {
  const { data: row, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

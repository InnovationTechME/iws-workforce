import { supabase } from './supabaseClient'

export async function getDeliveryLogs(limit = 300) {
  const { data, error } = await supabase
    .from('document_deliveries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getDeliveryLogsByWorker(workerId) {
  const { data, error } = await supabase
    .from('document_deliveries')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addDeliveryLog(payload) {
  const row = {
    ...payload,
    sent_at: payload.sent_at || new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('document_deliveries')
    .insert([row])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDeliveryLog(id, updates) {
  const { data, error } = await supabase
    .from('document_deliveries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

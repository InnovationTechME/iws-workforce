import { supabase } from './supabaseClient'

// All non-inactive workers, most recent first
export async function getWorkers() {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .neq('status', 'inactive')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getWorkers error:', error)
    return []
  }
  return data || []
}

// Return all workers including inactive
export async function getAllWorkers() {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getAllWorkers error:', error)
    return []
  }
  return data || []
}

// Alias
export async function getActiveWorkers() {
  return getWorkers()
}

// Visible = non-blacklisted workers (all statuses)
export async function getVisibleWorkers() {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .or('is_blacklisted.is.null,is_blacklisted.eq.false')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getVisibleWorkers error:', error)
    return []
  }
  return data || []
}

export async function getActiveVisibleWorkers() {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .neq('status', 'inactive')
    .or('is_blacklisted.is.null,is_blacklisted.eq.false')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getActiveVisibleWorkers error:', error)
    return []
  }
  return data || []
}

// Site workforce — excludes Office Staff
export async function getSiteWorkforce() {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .neq('status', 'inactive')
    .neq('category', 'Office Staff')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getSiteWorkforce error:', error)
    return []
  }
  return data || []
}

// Single worker by id
export async function getWorkerById(id) {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') {
    console.error('getWorkerById error:', error)
    return null
  }
  return data || null
}

// Alias
export async function getWorker(id) {
  return getWorkerById(id)
}

// Insert new worker and return the created row
export async function addWorker(data) {
  const { data: row, error } = await supabase
    .from('workers')
    .insert([data])
    .select()
    .single()
  if (error) {
    console.error('addWorker error:', error)
    return null
  }
  return row
}

// Update worker and return the updated row
export async function updateWorker(id, updates) {
  const { data: row, error } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('updateWorker error:', error)
    return null
  }
  return row
}

// Mark ILOE deducted — one time only, never reset
export async function markILOEDeducted(id) {
  const { data: current, error: readErr } = await supabase
    .from('workers')
    .select('iloe_deducted')
    .eq('id', id)
    .single()
  if (readErr) {
    console.error('markILOEDeducted read error:', readErr)
    return null
  }
  if (current?.iloe_deducted === true) return current
  const { data: row, error } = await supabase
    .from('workers')
    .update({ iloe_deducted: true })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('markILOEDeducted update error:', error)
    return null
  }
  return row
}

// Next sequential worker number: IWS-YYYY-0001, etc.
export async function getNextWorkerNumber() {
  const year = new Date().getFullYear()
  const { data, error } = await supabase
    .from('workers')
    .select('worker_number')
    .like('worker_number', `IWS-${year}-%`)
    .order('worker_number', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return `IWS-${year}-0001`
  }

  const lastNumber = data[0].worker_number
  const parts = lastNumber.split('-')
  const num = parseInt(parts[parts.length - 1], 10)
  const next = `IWS-${year}-${String(num + 1).padStart(4, '0')}`
  console.log('getNextWorkerNumber: last was', lastNumber, '— returning', next)
  return next
}

import { supabase } from './supabaseClient'

// Flatten joined worker onto each row
const flatten = (rows) => (rows || []).map(r => ({
  ...r,
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || ''
}))

export async function getLeaveRecords() {
  const { data, error } = await supabase
    .from('leave_records')
    .select('*, worker:workers(full_name, worker_number)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return flatten(data)
}

export async function getLeaveByWorker(workerId) {
  const { data, error } = await supabase
    .from('leave_records')
    .select('*, worker:workers(full_name, worker_number)')
    .eq('worker_id', workerId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return flatten(data)
}

export async function addLeaveRequest(data) {
  const { data: row, error } = await supabase
    .from('leave_records')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function updateLeaveRecord(id, updates) {
  const { data: row, error } = await supabase
    .from('leave_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// Active leave — for dashboard banner
export async function getActiveLeave() {
  const { data, error } = await supabase
    .from('leave_records')
    .select('*, worker:workers(full_name, worker_number)')
    .in('status', ['approved', 'on_leave'])
    .order('start_date', { ascending: true })
  if (error) throw error
  return flatten(data)
}

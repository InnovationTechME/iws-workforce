import { supabase } from './supabaseClient'

const flatten = (rows) => (rows || []).map(r => ({
  ...r,
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || ''
}))

export async function getTimesheetHeaders() {
  const { data, error } = await supabase
    .from('timesheet_headers')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getTimesheetHeaderById(id) {
  const { data, error } = await supabase
    .from('timesheet_headers')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getTimesheetLines(headerId) {
  const { data, error } = await supabase
    .from('timesheet_lines')
    .select('*, worker:workers(full_name, worker_number)')
    .eq('header_id', headerId)
    .order('work_date', { ascending: true })
  if (error) throw error
  return flatten(data)
}

export async function addTimesheetHeader(data) {
  const { data: row, error } = await supabase
    .from('timesheet_headers')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

// Bulk insert an array of timesheet lines
export async function addTimesheetLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return []
  const { data, error } = await supabase
    .from('timesheet_lines')
    .insert(lines)
    .select()
  if (error) throw error
  return data || []
}

export async function updateTimesheetHeader(id, updates) {
  const { data: row, error } = await supabase
    .from('timesheet_headers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// All lines for a worker across all headers
export async function getTimesheetsByWorker(workerId) {
  const { data, error } = await supabase
    .from('timesheet_lines')
    .select('*, header:timesheet_headers(*), worker:workers(full_name, worker_number)')
    .eq('worker_id', workerId)
    .order('work_date', { ascending: false })
  if (error) throw error
  return flatten(data)
}

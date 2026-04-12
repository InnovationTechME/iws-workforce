import { supabase } from './supabaseClient'

const flatten = (rows) => (rows || []).map(r => ({
  ...r,
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || ''
}))

export async function getAttendanceByWorker(workerId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, worker:workers(full_name, worker_number)')
    .eq('worker_id', workerId)
    .order('date', { ascending: false })
  if (error) throw error
  return flatten(data)
}

export async function getAllAttendance() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, worker:workers(full_name, worker_number)')
    .order('date', { ascending: false })
  if (error) throw error
  return flatten(data)
}

export async function addAttendanceRecord(data) {
  const { data: row, error } = await supabase
    .from('attendance')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function updateAttendanceRecord(id, updates) {
  const { data: row, error } = await supabase
    .from('attendance')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// Pending attendance conflicts with worker info
export async function getAttendanceConflicts() {
  const { data, error } = await supabase
    .from('attendance_conflicts')
    .select('*, worker:workers(full_name, worker_number)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return flatten(data)
}

export async function resolveConflict(id, resolution, finalDeduction, resolvedBy) {
  const updates = {
    status: 'resolved',
    resolution,
    final_deduction: finalDeduction,
    applied_deduction: finalDeduction,
    ops_approved_by: resolvedBy,
    ops_approved_at: new Date().toISOString()
  }
  const { data: row, error } = await supabase
    .from('attendance_conflicts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// Unresolved carry-over notes with worker name
export async function getCarryOverNotes() {
  const { data, error } = await supabase
    .from('carry_over_notes')
    .select('*, worker:workers(full_name, worker_number)')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return flatten(data)
}

import { supabase } from './supabaseClient'

// All open / in-progress tasks ordered by created_at desc
export async function getTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getTasksByWorker(workerId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addTask(data) {
  const { data: row, error } = await supabase
    .from('tasks')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

// Used to mark done (pass { status: 'done', completed_at: ... })
export async function updateTask(id, updates) {
  const { data: row, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// Count of open / in-progress tasks — for HR inbox badge
export async function getOpenTaskCount() {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'in_progress'])
  if (error) throw error
  return count || 0
}

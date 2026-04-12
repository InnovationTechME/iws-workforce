import { supabase } from './supabaseClient'

export async function getWarningsByWorker(workerId) {
  const { data, error } = await supabase
    .from('warnings')
    .select('*')
    .eq('worker_id', workerId)
    .order('issued_date', { ascending: false })
  if (error) throw error
  return data || []
}

// All warnings with worker full_name joined
export async function getAllWarnings() {
  const { data, error } = await supabase
    .from('warnings')
    .select('*, worker:workers(full_name, worker_number)')
    .order('issued_date', { ascending: false })
  if (error) throw error
  // Flatten joined worker fields so the page can read w.worker_name / w.worker_number
  return (data || []).map(w => ({
    ...w,
    worker_name: w.worker?.full_name || w.worker_name || '',
    worker_number: w.worker?.worker_number || w.worker_number || ''
  }))
}

export async function addWarning(data) {
  const { data: row, error } = await supabase
    .from('warnings')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function updateWarning(id, updates) {
  const { data: row, error } = await supabase
    .from('warnings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// Returns count by level — { first, second, final }
export async function getWarningCount(workerId) {
  const { data, error } = await supabase
    .from('warnings')
    .select('warning_type')
    .eq('worker_id', workerId)
  if (error) throw error
  const counts = { first: 0, second: 0, final: 0 }
  for (const row of (data || [])) {
    const t = String(row.warning_type || '').toLowerCase()
    if (t.includes('first') || t.includes('1st') || t === 'warning_1st') counts.first++
    else if (t.includes('second') || t.includes('2nd') || t === 'warning_2nd') counts.second++
    else if (t.includes('final') || t === 'warning_final') counts.final++
  }
  return counts
}

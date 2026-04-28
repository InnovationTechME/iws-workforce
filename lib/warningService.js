import { supabase } from './supabaseClient'
import { generateRefNumber } from './letterService'

function mapWarning(row) {
  if (!row) return row
  const levelToLetter = { '1st': 'warning_1st', '2nd': 'warning_2nd', final: 'warning_final' }
  return {
    ...row,
    status: row.status === 'active' ? 'open' : row.status,
    level: levelToLetter[row.level] || row.level,
    issue_date: row.issued_date || row.issue_date,
    worker_name: row.worker?.full_name || row.worker_name || '',
    worker_number: row.worker?.worker_number || row.worker_number || '',
  }
}

function dbPayload(data, { forInsert = false } = {}) {
  const payload = { ...data }
  if (payload.issue_date && !payload.issued_date) {
    payload.issued_date = payload.issue_date
    delete payload.issue_date
  }
  const levelToDb = { warning_1st: '1st', warning_2nd: '2nd', warning_final: 'final' }
  if (payload.level && levelToDb[payload.level]) payload.level = levelToDb[payload.level]
  if (payload.status === 'open') payload.status = 'active'
  if (forInsert && !payload.ref_number) payload.ref_number = generateRefNumber(payload.level || payload.warning_type || 'warning_1st')
  if (forInsert && !payload.level) payload.level = payload.warning_type === 'memo' ? 'memo' : 'warning_1st'
  delete payload.worker
  delete payload.worker_name
  delete payload.worker_number
  delete payload.notes
  return payload
}

export async function getWarningsByWorker(workerId) {
  const { data, error } = await supabase
    .from('warnings')
    .select('*')
    .eq('worker_id', workerId)
    .order('issued_date', { ascending: false })
  if (error) throw error
  return (data || []).map(mapWarning)
}

// All warnings with worker full_name joined
export async function getAllWarnings() {
  const { data, error } = await supabase
    .from('warnings')
    .select('*, worker:workers(full_name, worker_number)')
    .order('issued_date', { ascending: false })
  if (error) throw error
  // Flatten joined worker fields so the page can read w.worker_name / w.worker_number
  return (data || []).map(mapWarning)
}

export async function addWarning(data) {
  const { data: row, error } = await supabase
    .from('warnings')
    .insert([dbPayload(data, { forInsert: true })])
    .select()
    .single()
  if (error) throw error
  return mapWarning(row)
}

export async function updateWarning(id, updates) {
  const { data: row, error } = await supabase
    .from('warnings')
    .update(dbPayload(updates))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapWarning(row)
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

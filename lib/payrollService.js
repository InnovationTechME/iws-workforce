import { supabase } from './supabaseClient'

const flattenWorker = (rows) => (rows || []).map(r => ({
  ...r,
  worker_name: r.worker?.full_name || r.worker_name || '',
  worker_number: r.worker?.worker_number || r.worker_number || ''
}))

export async function getPayrollBatches() {
  const { data, error } = await supabase
    .from('payroll_batches')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPayrollBatchById(id) {
  const { data, error } = await supabase
    .from('payroll_batches')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getPayrollLines(batchId) {
  const { data, error } = await supabase
    .from('payroll_lines')
    .select('*, worker:workers(*)')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return flattenWorker(data)
}

export async function addPayrollBatch(data) {
  const { data: row, error } = await supabase
    .from('payroll_batches')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function addPayrollLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return []
  const { data, error } = await supabase
    .from('payroll_lines')
    .insert(lines)
    .select()
  if (error) throw error
  return data || []
}

export async function updatePayrollBatch(id, updates) {
  const { data: row, error } = await supabase
    .from('payroll_batches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

export async function updatePayrollLine(id, updates) {
  const { data: row, error } = await supabase
    .from('payroll_lines')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

// Lock a batch — irreversible. Uses status='locked', no separate boolean.
export async function lockPayrollBatch(id, lockedBy) {
  const { data: row, error } = await supabase
    .from('payroll_batches')
    .update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: lockedBy
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

export async function getPayrollByWorker(workerId) {
  const { data, error } = await supabase
    .from('payroll_lines')
    .select('*, batch:payroll_batches(month, year, month_label, status)')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addPayrollAdjustment(data) {
  const { data: row, error } = await supabase
    .from('payroll_adjustments')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function getAdjustmentsByBatch(batchId) {
  const { data, error } = await supabase
    .from('payroll_adjustments')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Call the generate_payroll_batch RPC (atomic batch generation)
export async function generatePayrollBatch(month, year, monthLabel) {
  const { data, error } = await supabase
    .rpc('generate_payroll_batch', {
      p_month: month,
      p_year: year,
      p_month_label: monthLabel
    })
  if (error) throw error
  return data // returns the new batch UUID
}

// Delete a draft/calculated batch (guard: only draft or calculated)
export async function deletePayrollBatch(id) {
  // First verify it's deletable
  const { data: batch, error: fetchErr } = await supabase
    .from('payroll_batches')
    .select('status')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr
  if (!batch || !['draft', 'calculated'].includes(batch.status)) {
    throw new Error('Cannot delete a batch with status: ' + (batch?.status || 'unknown'))
  }
  // Delete lines first (FK constraint)
  const { error: linesErr } = await supabase
    .from('payroll_lines')
    .delete()
    .eq('batch_id', id)
  if (linesErr) throw linesErr
  // Delete adjustments
  const { error: adjErr } = await supabase
    .from('payroll_adjustments')
    .delete()
    .eq('batch_id', id)
  if (adjErr) throw adjErr
  // Delete batch
  const { error: batchErr } = await supabase
    .from('payroll_batches')
    .delete()
    .eq('id', id)
  if (batchErr) throw batchErr
}

// Find batch by month + year
export async function getPayrollBatchByMonthYear(month, year) {
  const { data, error } = await supabase
    .from('payroll_batches')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

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

/**
 * @deprecated Use approvePayrollBatchOwner() instead — it combines owner approval + lock atomically.
 * Kept for backward compatibility with scripts.
 */
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

// ── PR #7: Approval flow functions (atomic, with WHERE guards) ──

const OPS_ROLES = ['operations', 'owner', 'accounts']
const OWNER_ROLES = ['owner', 'accounts']

export async function approvePayrollBatchOps(batchId, approverRole, approverName) {
  if (!OPS_ROLES.includes(approverRole)) throw new Error('Role not authorised for Ops approval.')
  const { data, error } = await supabase
    .from('payroll_batches')
    .update({
      ops_approval_status: 'approved',
      ops_approved_by: approverName,
      ops_approved_at: new Date().toISOString(),
      ops_rejection_reason: null,
      status: 'ops_approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .eq('status', 'calculated')
    .eq('ops_approval_status', 'pending')
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Batch is not in a state that can receive Ops approval (already approved, rejected, or locked).')
  return data
}

export async function rejectPayrollBatchOps(batchId, approverRole, approverName, reason) {
  if (!OPS_ROLES.includes(approverRole)) throw new Error('Role not authorised for Ops rejection.')
  if (!reason || reason.trim().length < 10) throw new Error('Rejection reason must be at least 10 characters.')
  const { data, error } = await supabase
    .from('payroll_batches')
    .update({
      ops_approval_status: 'rejected',
      ops_rejection_reason: reason.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .eq('status', 'calculated')
    .eq('ops_approval_status', 'pending')
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Batch is not in a state that can receive Ops rejection (already approved, rejected, or locked).')
  return data
}

export async function approvePayrollBatchOwner(batchId, approverRole, approverName) {
  if (!OWNER_ROLES.includes(approverRole)) throw new Error('Role not authorised for Owner approval.')
  const lockDate = new Date()
  const retainUntil = new Date(lockDate)
  retainUntil.setFullYear(retainUntil.getFullYear() + 5)
  const { data, error } = await supabase
    .from('payroll_batches')
    .update({
      owner_approval_status: 'approved',
      owner_approved_by: approverName,
      owner_approved_at: lockDate.toISOString(),
      owner_rejection_reason: null,
      status: 'locked',
      locked_at: lockDate.toISOString(),
      locked_by: approverName,
      retain_until: retainUntil.toISOString().split('T')[0],
      updated_at: lockDate.toISOString()
    })
    .eq('id', batchId)
    .in('status', ['ops_approved', 'owner_approved'])
    .eq('ops_approval_status', 'approved')
    .eq('owner_approval_status', 'pending')
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Batch is not ready for Owner approval (Ops approval missing, or already processed).')
  return data
}

export async function rejectPayrollBatchOwner(batchId, approverRole, approverName, reason) {
  if (!OWNER_ROLES.includes(approverRole)) throw new Error('Role not authorised for Owner rejection.')
  if (!reason || reason.trim().length < 10) throw new Error('Rejection reason must be at least 10 characters.')
  const { data, error } = await supabase
    .from('payroll_batches')
    .update({
      owner_approval_status: 'rejected',
      owner_rejection_reason: reason.trim(),
      status: 'ops_approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .in('status', ['ops_approved', 'owner_approved'])
    .eq('owner_approval_status', 'pending')
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Batch is not in a state that can receive Owner rejection.')
  return data
}

export async function unlockPayrollBatch(batchId, approverRole, approverName, reason) {
  if (approverRole !== 'owner') throw new Error('Only Owner can unlock a payroll batch.')
  if (!reason || reason.trim().length < 20) throw new Error('Unlock reason must be at least 20 characters.')
  const { data, error } = await supabase
    .from('payroll_batches')
    .update({
      status: 'owner_approved',
      owner_approval_status: 'pending',
      locked_at: null,
      locked_by: null,
      retain_until: null,
      unlock_reason: reason.trim(),
      unlocked_by: approverName,
      unlocked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .eq('status', 'locked')
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Batch is not locked — cannot unlock.')
  return data
}

export async function extendRetainUntil(batchId, approverRole, newDate) {
  if (approverRole !== 'owner') throw new Error('Only Owner can extend retain_until.')
  const nd = new Date(newDate)
  if (isNaN(nd.getTime())) throw new Error('Invalid date.')
  // Fetch batch to validate range
  const { data: batch, error: fetchErr } = await supabase
    .from('payroll_batches')
    .select('locked_at, retain_until')
    .eq('id', batchId)
    .eq('status', 'locked')
    .single()
  if (fetchErr || !batch) throw new Error('Batch not found or not locked.')
  const lockDate = new Date(batch.locked_at)
  const minDate = new Date(lockDate); minDate.setFullYear(minDate.getFullYear() + 2)
  const maxDate = new Date(lockDate); maxDate.setFullYear(maxDate.getFullYear() + 10)
  if (nd < minDate) throw new Error(`retain_until must be at least 2 years from lock date (${minDate.toISOString().split('T')[0]}).`)
  if (nd > maxDate) throw new Error(`retain_until cannot exceed 10 years from lock date (${maxDate.toISOString().split('T')[0]}).`)
  const newDateStr = nd.toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('payroll_batches')
    .update({ retain_until: newDateStr, updated_at: new Date().toISOString() })
    .eq('id', batchId)
    .eq('status', 'locked')
    .lt('retain_until', newDateStr)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Cannot shorten retain_until — new date must be later than current.')
  return data
}

// Get batches pending approval for a given role (used by ApprovalsDashboard)
export async function getBatchesPendingApproval(role) {
  let query
  if (role === 'operations') {
    query = supabase.from('payroll_batches').select('*')
      .eq('status', 'calculated').eq('ops_approval_status', 'pending')
  } else if (role === 'owner' || role === 'accounts') {
    // Owner/Accounts see both Ops-pending and Owner-pending batches
    query = supabase.from('payroll_batches').select('*')
      .or('and(status.eq.calculated,ops_approval_status.eq.pending),and(status.eq.ops_approved,owner_approval_status.eq.pending)')
  } else if (role === 'hr_admin') {
    // HR sees rejected batches
    query = supabase.from('payroll_batches').select('*')
      .or('ops_approval_status.eq.rejected,owner_approval_status.eq.rejected')
  } else {
    return []
  }
  const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false })
  if (error) throw error
  return data || []
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

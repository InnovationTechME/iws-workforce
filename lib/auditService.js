import { supabase } from './supabaseClient'

export const RESTORABLE_TABLES = new Set([
  'workers',
  'suppliers',
  'supplier_rates',
  'documents',
  'certifications',
  'warnings',
  'letters',
  'tasks',
  'timesheet_headers',
  'timesheet_lines',
  'timesheet_discrepancies',
  'supplier_timesheet_summaries',
  'payroll_batches',
  'payroll_lines',
  'payroll_adjustments',
  'offboarding',
  'onboarding',
  'offers',
  'clients',
  'attendance',
  'leave_records',
  'public_holidays',
  'work_experience',
])

export async function getAuditLogs(limit = 200) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getDeletedRecords(limit = 200) {
  const { data, error } = await supabase
    .from('deleted_records')
    .select('*')
    .order('deleted_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function markDeletedRecordIgnored(id, note) {
  const { data, error } = await supabase
    .from('deleted_records')
    .update({
      restore_status: 'ignored',
      restore_note: note || 'Marked ignored from Trash & Restore',
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function restoreDeletedRecord(row, note) {
  if (!row?.id || !row?.source_table || !row?.record_data) {
    throw new Error('Deleted record is incomplete.')
  }
  if (!RESTORABLE_TABLES.has(row.source_table)) {
    throw new Error(`Restore is not enabled for ${row.source_table}.`)
  }
  if (row.restore_status !== 'available') {
    throw new Error('This record is no longer available for restore.')
  }

  const { error: insertError } = await supabase
    .from(row.source_table)
    .insert([row.record_data])
  if (insertError) throw insertError

  const { data, error } = await supabase
    .from('deleted_records')
    .update({
      restore_status: 'restored',
      restored_at: new Date().toISOString(),
      restore_note: note || 'Restored from Trash & Restore',
    })
    .eq('id', row.id)
    .select()
    .single()
  if (error) throw error
  return data
}

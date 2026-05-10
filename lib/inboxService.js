import { supabase } from './supabaseClient'
import { getInsuranceExpiryAlerts } from './documentService'

export const TIMESHEET_PENDING_STATUSES = ['uploaded', 'under_review']

const EMPTY_INBOX = {
  missingDocs: [],
  expiredDocs: [],
  expiringDocs: [],
  contractsDue: [],
  expiredCerts: [],
  expiringCerts: [],
  openWarnings: [],
  pendingTimesheets: [],
  leaveRequests: [],
  leaveNonReturn: [],
  pendingTasks: [],
  pendingDiscrepancies: [],
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isoDate(date) {
  return date.toISOString().split('T')[0]
}

function inclusiveDays(startDate, endDate) {
  if (!startDate || !endDate) return null
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return Math.max(1, Math.round((end - start) / 86400000) + 1)
}

function workerFields(row) {
  const worker = row?.workers || row?.worker || {}
  return {
    worker_name: worker.full_name || row?.worker_name || 'Unknown worker',
    worker_number: worker.worker_number || row?.worker_number || '-',
  }
}

function mapDocument(row) {
  return {
    ...row,
    ...workerFields(row),
    document_type: row.doc_type,
  }
}

function mapCertification(row) {
  return {
    ...row,
    ...workerFields(row),
    certification_type: row.cert_type,
  }
}

function mapWarning(row) {
  return {
    ...row,
    ...workerFields(row),
    status: row.status === 'active' ? 'open' : row.status,
  }
}

function mapLeave(row) {
  const days = row.calendar_days || inclusiveDays(row.start_date, row.end_date) || 0
  return {
    ...row,
    ...workerFields(row),
    days_count: days,
    expected_return: row.end_date,
  }
}

function mapTask(row) {
  return {
    ...row,
    ...workerFields(row),
  }
}

function mapTimesheet(row) {
  return {
    ...row,
    job_no: row.month_label || `${row.month}/${row.year}`,
    final_approval_status: row.status,
  }
}

function mapDiscrepancy(row) {
  return {
    ...row,
    client_name: row.header?.client_name || '',
    month_label: row.header?.month_label || '',
  }
}

function ensureRows(response, fallback = []) {
  if (response.error) throw response.error
  return response.data || fallback
}

export function isPendingTimesheet(row) {
  return TIMESHEET_PENDING_STATUSES.includes(String(row?.status || '').toLowerCase())
}

export async function getLiveInbox() {
  const today = isoDate(new Date())
  const in30 = isoDate(addDays(new Date(), 30))
  const in42 = isoDate(addDays(new Date(), 42))

  const [
    missingDocsRes,
    expiredDocsRes,
    expiringDocsRes,
    contractsDueRes,
    expiredCertsRes,
    expiringCertsRes,
    warningsRes,
    timesheetsRes,
    leaveRes,
    tasksRes,
    discrepancyRes,
    insuranceAlerts,
  ] = await Promise.all([
    supabase.from('documents').select('*, workers(worker_number, full_name)').eq('status', 'missing').eq('is_blocking', true),
    supabase.from('documents').select('*, workers(worker_number, full_name)').lt('expiry_date', today).neq('status', 'missing'),
    supabase.from('documents').select('*, workers(worker_number, full_name)').gte('expiry_date', today).lte('expiry_date', in30),
    supabase.from('documents').select('*, workers(worker_number, full_name)').eq('doc_type', 'employment_contract').gte('expiry_date', today).lte('expiry_date', in42),
    supabase.from('certifications').select('*, workers(worker_number, full_name)').lt('expiry_date', today),
    supabase.from('certifications').select('*, workers(worker_number, full_name)').gte('expiry_date', today).lte('expiry_date', in30),
    supabase.from('warnings').select('*, workers(worker_number, full_name)').not('status', 'in', '("closed","resolved")').order('issued_date', { ascending: false }),
    supabase.from('timesheet_headers').select('*').in('status', TIMESHEET_PENDING_STATUSES).order('year', { ascending: false }).order('month', { ascending: false }),
    supabase.from('leave_records').select('*, workers(worker_number, full_name)').order('created_at', { ascending: false }),
    supabase.from('tasks').select('*, workers(worker_number, full_name)').in('status', ['open', 'in_progress']).order('created_at', { ascending: false }),
    supabase.from('timesheet_discrepancies').select('*, header:timesheet_headers(client_name, month_label, month, year)').eq('status', 'pending').order('updated_at', { ascending: false }),
    getInsuranceExpiryAlerts().catch(() => []),
  ])

  const leaveRows = ensureRows(leaveRes)
  const pendingLeave = leaveRows.filter(row => ['pending', 'submitted'].includes(String(row.status || '').toLowerCase()))
  const leaveNonReturn = leaveRows.filter(row => {
    const status = String(row.status || '').toLowerCase()
    return row.end_date && row.end_date < today && !row.return_confirmed_at && ['approved', 'on_leave', 'departed'].includes(status)
  })

  return {
    ...EMPTY_INBOX,
    missingDocs: ensureRows(missingDocsRes).map(mapDocument),
    expiredDocs: ensureRows(expiredDocsRes).map(mapDocument),
    expiringDocs: ensureRows(expiringDocsRes).map(mapDocument),
    contractsDue: ensureRows(contractsDueRes).map(mapDocument),
    expiredCerts: ensureRows(expiredCertsRes).map(mapCertification),
    expiringCerts: ensureRows(expiringCertsRes).map(mapCertification),
    openWarnings: ensureRows(warningsRes).map(mapWarning),
    pendingTimesheets: ensureRows(timesheetsRes).map(mapTimesheet),
    leaveRequests: pendingLeave.map(mapLeave),
    leaveNonReturn: leaveNonReturn.map(row => ({
      ...mapLeave(row),
      leave_id: row.id,
      days_overdue: row.end_date ? Math.max(0, inclusiveDays(row.end_date, today) - 1) : 0,
    })),
    pendingTasks: ensureRows(tasksRes).map(mapTask),
    pendingDiscrepancies: ensureRows(discrepancyRes).map(mapDiscrepancy),
    insuranceAlerts: Array.isArray(insuranceAlerts) ? insuranceAlerts : [],
  }
}

import { supabase } from './supabaseClient'

const TABLE_MISSING_CODES = new Set(['42P01', 'PGRST205'])

function isMissingDiscrepancyTable(error) {
  return TABLE_MISSING_CODES.has(error?.code) || /timesheet_discrepancies/i.test(error?.message || '') && /not found|does not exist/i.test(error?.message || '')
}

export async function getPendingDiscrepanciesByPeriod(month, year) {
  if (!month || !year) {
    return { pendingCount: 0, headers: [], rows: [], tableAvailable: true }
  }

  const { data: headers, error: headerError } = await supabase
    .from('timesheet_headers')
    .select('id, client_name, month_label, month, year')
    .eq('month', month)
    .eq('year', year)

  if (headerError) {
    console.error('[TimesheetDiscrepancyService] header lookup failed', headerError)
    return { pendingCount: 0, headers: [], rows: [], tableAvailable: true, error: headerError.message }
  }

  const headerRows = headers || []
  const headerIds = headerRows.map(h => h.id).filter(Boolean)
  if (headerIds.length === 0) {
    return { pendingCount: 0, headers: [], rows: [], tableAvailable: true }
  }

  const { data, error } = await supabase
    .from('timesheet_discrepancies')
    .select('id, header_id, source_file_name, client_worker_name, iws_worker_name, difference, status, updated_at')
    .in('header_id', headerIds)
    .eq('status', 'pending')
    .order('updated_at', { ascending: false })

  if (error) {
    if (isMissingDiscrepancyTable(error)) {
      return { pendingCount: 0, headers: headerRows, rows: [], tableAvailable: false }
    }
    console.error('[TimesheetDiscrepancyService] pending lookup failed', error)
    return { pendingCount: 0, headers: headerRows, rows: [], tableAvailable: true, error: error.message }
  }

  const headerById = Object.fromEntries(headerRows.map(h => [h.id, h]))
  const rows = (data || []).map(row => ({
    ...row,
    header: headerById[row.header_id] || null
  }))
  const headersWithPending = headerRows.filter(header => rows.some(row => row.header_id === header.id))

  return {
    pendingCount: rows.length,
    headers: headersWithPending,
    rows,
    tableAvailable: true
  }
}

import { supabase } from './supabaseClient'

const storageKey = (headerId) => `iws.timesheetReconciliation.${headerId}`
const TABLE_MISSING_CODES = new Set(['42P01', 'PGRST205'])

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadLocalReview(headerId) {
  if (!headerId || !canUseLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(storageKey(headerId))
    const parsed = raw ? JSON.parse(raw) : null
    return parsed ? { ...parsed, storage: parsed.storage || 'browser' } : null
  } catch {
    return null
  }
}

function saveLocalReview(headerId, review) {
  if (!headerId || !canUseLocalStorage()) return null
  const payload = {
    ...review,
    storage: 'browser',
    saved_at: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(storageKey(headerId), JSON.stringify(payload))
    return payload
  } catch {
    return null
  }
}

function clearLocalReview(headerId) {
  if (!headerId || !canUseLocalStorage()) return
  window.localStorage.removeItem(storageKey(headerId))
}

function fromDiscrepancyRow(row) {
  return {
    id: row.id,
    client_id: row.client_worker_id || '',
    client_name: row.client_worker_name,
    client_trade: row.client_trade || '',
    iws_worker_id: row.worker_id || null,
    iws_worker_name: row.iws_worker_name || 'NOT MATCHED',
    iws_hours: Number(row.iws_hours || 0),
    client_hours: Number(row.client_hours || 0),
    difference: Number(row.difference || 0),
    status: row.status || 'pending',
    resolution: row.resolution || null,
    resolved_at: row.resolved_at || null,
    matched: !!row.worker_id,
  }
}

function toDiscrepancyRow(headerId, discrepancy, sourceFileName) {
  return {
    header_id: headerId,
    worker_id: discrepancy.iws_worker_id || null,
    client_worker_id: discrepancy.client_id || null,
    client_worker_name: discrepancy.client_name || 'Unknown client worker',
    client_trade: discrepancy.client_trade || null,
    iws_worker_name: discrepancy.iws_worker_name || null,
    iws_hours: Number(discrepancy.iws_hours || 0),
    client_hours: Number(discrepancy.client_hours || 0),
    difference: Number(discrepancy.difference || 0),
    status: discrepancy.status || 'pending',
    resolution: discrepancy.resolution || null,
    resolved_at: discrepancy.resolved_at || null,
    source_file_name: sourceFileName || null,
  }
}

function isMissingTable(error) {
  return error && TABLE_MISSING_CODES.has(error.code)
}

export async function loadReconciliationReview(headerId) {
  if (!headerId) return null
  const { data, error } = await supabase
    .from('timesheet_discrepancies')
    .select('*')
    .eq('header_id', headerId)
    .order('created_at', { ascending: true })

  if (!error) {
    if (!data?.length) return loadLocalReview(headerId)
    return {
      storage: 'database',
      saved_at: data.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, data[0].updated_at),
      source_file_name: data.find(row => row.source_file_name)?.source_file_name || null,
      clientData: [],
      discrepancies: data.map(fromDiscrepancyRow),
    }
  }

  if (!isMissingTable(error)) {
    console.error('loadReconciliationReview error:', error.message)
  }
  return loadLocalReview(headerId)
}

export async function saveReconciliationReview(headerId, review) {
  if (!headerId) return null
  const payload = {
    ...review,
    storage: 'database',
    saved_at: new Date().toISOString(),
  }

  const { error: deleteError } = await supabase
    .from('timesheet_discrepancies')
    .delete()
    .eq('header_id', headerId)

  if (deleteError) {
    if (!isMissingTable(deleteError)) console.error('saveReconciliationReview delete error:', deleteError.message)
    return saveLocalReview(headerId, review)
  }

  const rows = (review.discrepancies || []).map(d => toDiscrepancyRow(headerId, d, review.fileName || review.source_file_name))
  if (rows.length === 0) {
    clearLocalReview(headerId)
    return payload
  }

  const { error: insertError } = await supabase
    .from('timesheet_discrepancies')
    .insert(rows)

  if (insertError) {
    if (!isMissingTable(insertError)) console.error('saveReconciliationReview insert error:', insertError.message)
    return saveLocalReview(headerId, review)
  }

  clearLocalReview(headerId)
  return payload
}

export async function clearReconciliationReview(headerId) {
  if (!headerId) return
  clearLocalReview(headerId)
  const { error } = await supabase
    .from('timesheet_discrepancies')
    .delete()
    .eq('header_id', headerId)
  if (error && !isMissingTable(error)) {
    console.error('clearReconciliationReview error:', error.message)
  }
}

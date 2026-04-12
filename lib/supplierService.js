import { supabase } from './supabaseClient'

// ── SUPPLIERS ──────────────────────────────────────────

export async function getSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) {
    console.error('getSuppliers error:', error)
    return []
  }
  return data || []
}

export async function getSupplierById(id) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*, rates:supplier_rates(*)')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') {
    console.error('getSupplierById error:', error)
    return null
  }
  return data || null
}

export async function addSupplier(payload) {
  const { data: row, error } = await supabase
    .from('suppliers')
    .insert([payload])
    .select()
    .single()
  if (error) {
    console.error('addSupplier error:', error)
    return null
  }
  return row
}

export async function updateSupplier(id, updates) {
  const { data: row, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('updateSupplier error:', error)
    return null
  }
  return row
}

// ── SUPPLIER RATES ─────────────────────────────────────

export async function getSupplierRates(supplierId) {
  const { data, error } = await supabase
    .from('supplier_rates')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('trade_role', { ascending: true })
  if (error) {
    console.error('getSupplierRates error:', error)
    return []
  }
  return data || []
}

export async function addSupplierRate(supplierId, tradeRole, hourlyRate, effectiveFrom, notes) {
  const { data: row, error } = await supabase
    .from('supplier_rates')
    .insert([{
      supplier_id: supplierId,
      trade_role: tradeRole,
      hourly_rate: hourlyRate,
      effective_from: effectiveFrom,
      notes: notes || null
    }])
    .select()
    .single()
  if (error) {
    console.error('addSupplierRate error:', error)
    return null
  }
  return row
}

export async function updateSupplierRate(id, updates) {
  const { data: row, error } = await supabase
    .from('supplier_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('updateSupplierRate error:', error)
    return null
  }
  return row
}

export async function getActiveRateForWorker(supplierId, tradeRole) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('supplier_rates')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('trade_role', tradeRole)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.error('getActiveRateForWorker error:', error)
    return null
  }
  return data || null
}

// ── WORKERS BELONGING TO A SUPPLIER ────────────────────

export async function getSupplierWorkers(supplierId) {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('supplier_id', supplierId)
    .neq('status', 'inactive')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getSupplierWorkers error:', error)
    return []
  }
  return data || []
}

// ── SUPPLIER TIMESHEET SUMMARIES ───────────────────────

export async function getSupplierSummaries(supplierId) {
  const { data, error } = await supabase
    .from('supplier_timesheet_summaries')
    .select('*, supplier:suppliers(name, trade_speciality)')
    .eq('supplier_id', supplierId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) {
    console.error('getSupplierSummaries error:', error)
    return []
  }
  return data || []
}

export async function getAllSupplierSummaries() {
  const { data, error } = await supabase
    .from('supplier_timesheet_summaries')
    .select('*, supplier:suppliers(name, trade_speciality)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) {
    console.error('getAllSupplierSummaries error:', error)
    return []
  }
  return data || []
}

export async function getSupplierSummaryById(id) {
  const { data, error } = await supabase
    .from('supplier_timesheet_summaries')
    .select('*, supplier:suppliers(*)')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') {
    console.error('getSupplierSummaryById error:', error)
    return null
  }
  return data || null
}

export async function createSupplierSummary(payload) {
  const { data: row, error } = await supabase
    .from('supplier_timesheet_summaries')
    .insert([payload])
    .select()
    .single()
  if (error) {
    console.error('createSupplierSummary error:', error)
    return null
  }
  return row
}

export async function updateSupplierSummary(id, updates) {
  const { data: row, error } = await supabase
    .from('supplier_timesheet_summaries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('updateSupplierSummary error:', error)
    return null
  }
  return row
}

export async function getAllPendingSummaries() {
  const { data, error } = await supabase
    .from('supplier_timesheet_summaries')
    .select('*, supplier:suppliers(name, trade_speciality)')
    .in('status', ['draft', 'sent'])
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) {
    console.error('getAllPendingSummaries error:', error)
    return []
  }
  return data || []
}

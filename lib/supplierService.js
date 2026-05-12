import { supabase } from './supabaseClient'

const PLACEHOLDER_SUPPLIER_NAMES = new Set(['Supplier Assignment Pending'])
const PLACEHOLDER_PO_NUMBERS = new Set(['PENDING-SUPPLIER-REVIEW'])

function isOperationalSupplier(row) {
  return row
    && !PLACEHOLDER_SUPPLIER_NAMES.has(row.name)
    && !PLACEHOLDER_PO_NUMBERS.has(row.po_number)
}

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
  return (data || []).filter(isOperationalSupplier)
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

export async function getSupplierSummaryLines(supplierId, month, year) {
  const [workers, headers] = await Promise.all([
    getSupplierWorkers(supplierId),
    supabase
      .from('timesheet_headers')
      .select('id, client_name, month_label')
      .eq('month', month)
      .eq('year', year)
      .then(({ data, error }) => {
        if (error) throw error
        return data || []
      })
  ])

  const workerIds = workers.map(w => w.id)
  const headerIds = headers.map(h => h.id)
  if (workerIds.length === 0 || headerIds.length === 0) return []

  const { data, error } = await supabase
    .from('timesheet_lines')
    .select('worker_id, header_id, work_date, total_hours, worker:workers(id, worker_number, full_name, trade_role, hourly_rate, supplier_rate)')
    .in('worker_id', workerIds)
    .in('header_id', headerIds)
    .order('work_date', { ascending: true })

  if (error) {
    console.error('getSupplierSummaryLines error:', error)
    return []
  }

  const headerById = Object.fromEntries(headers.map(h => [h.id, h]))
  const byWorker = new Map()
  ;(data || []).forEach(line => {
    const worker = line.worker || workers.find(w => w.id === line.worker_id) || {}
    const key = line.worker_id
    if (!byWorker.has(key)) {
      const rate = Number(worker.supplier_rate || worker.hourly_rate || 0)
      byWorker.set(key, {
        worker_id: key,
        worker_number: worker.worker_number || '',
        full_name: worker.full_name || '',
        trade_role: worker.trade_role || '',
        rate,
        total_hours: 0,
        amount: 0,
        clients: new Set(),
      })
    }
    const row = byWorker.get(key)
    const hours = Number(line.total_hours || 0)
    row.total_hours += hours
    row.amount += hours * Number(row.rate || 0)
    const header = headerById[line.header_id]
    if (header?.client_name) row.clients.add(header.client_name)
  })

  return Array.from(byWorker.values()).map(row => ({
    ...row,
    total_hours: Math.round(row.total_hours * 100) / 100,
    amount: Math.round(row.amount * 100) / 100,
    clients: Array.from(row.clients),
  })).sort((a, b) => String(a.worker_number).localeCompare(String(b.worker_number)))
}

export async function generateSupplierMonthlySummary(supplierId, month, year) {
  const [supplier, lines] = await Promise.all([
    getSupplierById(supplierId),
    getSupplierSummaryLines(supplierId, month, year),
  ])
  if (!supplier) return null

  const totalHours = lines.reduce((sum, line) => sum + Number(line.total_hours || 0), 0)
  const totalAmount = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
  const monthLabel = `${new Date(year, month - 1, 1).toLocaleString('en-AE', { month: 'long' })} ${year}`

  const payload = {
    supplier_id: supplierId,
    month,
    year,
    month_label: monthLabel,
    total_workers: lines.filter(line => Number(line.total_hours || 0) > 0).length,
    total_hours: Math.round(totalHours * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
    po_number: supplier.po_number || null,
    notes: lines.length === 0 ? 'Generated from timesheets: no supplier worker hours found for this month.' : 'Generated from supplier-linked timesheet lines.',
    updated_at: new Date().toISOString(),
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('supplier_timesheet_summaries')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('month', month)
    .eq('year', year)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (existingError) {
    console.error('generateSupplierMonthlySummary existing lookup error:', existingError)
    return null
  }

  const existing = existingRows?.[0]
  if (existing?.id) {
    const preserveInvoice = {
      invoice_number: existing.invoice_number,
      invoice_amount: existing.invoice_amount,
      invoice_date: existing.invoice_date,
      invoice_received: existing.invoice_received,
    }
    const { data: row, error } = await supabase
      .from('supplier_timesheet_summaries')
      .update({ ...payload, ...preserveInvoice, status: existing.status === 'paid' ? 'paid' : existing.status || 'draft' })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) {
      console.error('generateSupplierMonthlySummary update error:', error)
      return null
    }
    return { summary: row, lines }
  }

  const { data: row, error } = await supabase
    .from('supplier_timesheet_summaries')
    .insert([{ ...payload, status: 'draft' }])
    .select()
    .single()
  if (error) {
    console.error('generateSupplierMonthlySummary insert error:', error)
    return null
  }
  return { summary: row, lines }
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

export async function assignWorkerToSupplier(workerId, supplierId, rate) {
  const updates = {
    supplier_id: supplierId,
    supplier_rate: rate ? Number(rate.hourly_rate) : null,
    hourly_rate: rate ? Number(rate.hourly_rate) : null,
    trade_role: rate?.trade_role || null,
    category: 'Subcontract Worker',
    entry_track: 'subcontractor_company_worker',
    updated_at: new Date().toISOString(),
  }
  const { data: row, error } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', workerId)
    .select()
    .single()
  if (error) {
    console.error('assignWorkerToSupplier error:', error)
    return null
  }
  return row
}

export async function getUnlinkedSupplierWorkers() {
  const [{ data: workers, error }, { data: suppliers, error: supplierError }] = await Promise.all([
    supabase
    .from('workers')
      .select('id, worker_number, full_name, trade_role, hourly_rate, status, supplier_id')
    .eq('category', 'Subcontract Worker')
    .neq('status', 'inactive')
      .order('created_at', { ascending: false }),
    supabase
      .from('suppliers')
      .select('id, name, active, po_number')
  ])
  if (error) {
    console.error('getUnlinkedSupplierWorkers error:', error)
    return []
  }
  if (supplierError) {
    console.error('getUnlinkedSupplierWorkers suppliers error:', supplierError)
    return []
  }
  const supplierById = new Map((suppliers || []).map(supplier => [supplier.id, supplier]))
  return (workers || []).filter(row => !row.supplier_id || !isOperationalSupplier(supplierById.get(row.supplier_id)))
}

// Import existing worker records while preserving the company's original
// worker_number values. Run with:
//   node scripts/importExistingWorkers.mjs path\to\workers.csv --dry-run
//   node scripts/importExistingWorkers.mjs path\to\workers.csv --apply
//
// Required CSV columns:
// worker_number,first_name,last_name,category,status
//
// Useful optional columns:
// full_name,nationality,passport_number,passport_expiry,trade_role,monthly_salary,
// hourly_rate,payment_method,joining_date,email,whatsapp_number,supplier_name,
// supplier_rate,emirates_id,emirates_id_expiry,visa_number,visa_expiry

import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const csvPath = process.argv[2]
const apply = process.argv.includes('--apply')
const dryRun = process.argv.includes('--dry-run') || !apply

if (!csvPath) {
  console.error('Missing CSV path. Example: node scripts/importExistingWorkers.mjs workers.csv --dry-run')
  process.exit(1)
}

function loadEnv() {
  const text = readFileSync(resolve('.env.local'), 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (quoted && ch === '"' && next === '"') {
      value += '"'
      i++
    } else if (ch === '"') {
      quoted = !quoted
    } else if (!quoted && ch === ',') {
      row.push(value)
      value = ''
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i++
      row.push(value)
      value = ''
      if (row.some(cell => cell.trim())) rows.push(row)
      row = []
    } else {
      value += ch
    }
  }
  row.push(value)
  if (row.some(cell => cell.trim())) rows.push(row)
  return rows
}

function asNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function asText(value) {
  const text = String(value || '').trim()
  return text || null
}

function normalizeCategory(value) {
  const text = String(value || '').trim()
  const lower = text.toLowerCase()
  if (lower.includes('office')) return 'Office Staff'
  if (lower.includes('contract') && !lower.includes('sub')) return 'Contract Worker'
  if (lower.includes('supplier') || lower.includes('sub')) return 'Subcontract Worker'
  return text || 'Permanent Staff'
}

function entryTrackFor(category) {
  if (category === 'Contract Worker') return 'contract_worker'
  if (category === 'Subcontract Worker') return 'subcontractor_company_worker'
  return 'direct_staff'
}

const text = readFileSync(resolve(csvPath), 'utf8')
const [headersRaw, ...body] = parseCsv(text)
const headers = headersRaw.map(h => h.trim())
const required = ['worker_number', 'first_name', 'last_name', 'category', 'status']
const missing = required.filter(col => !headers.includes(col))
if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`)

const records = body.map((cells, index) => {
  const row = Object.fromEntries(headers.map((header, i) => [header, cells[i] || '']))
  const category = normalizeCategory(row.category)
  const fullName = asText(row.full_name) || `${asText(row.first_name) || ''} ${asText(row.last_name) || ''}`.trim()
  return {
    source_line: index + 2,
    worker_number: asText(row.worker_number),
    first_name: asText(row.first_name),
    last_name: asText(row.last_name),
    full_name: fullName,
    nationality: asText(row.nationality),
    passport_number: asText(row.passport_number),
    passport_expiry: asText(row.passport_expiry),
    trade_role: asText(row.trade_role),
    category,
    entry_track: entryTrackFor(category),
    status: asText(row.status) || 'active',
    monthly_salary: asNumber(row.monthly_salary),
    hourly_rate: asNumber(row.hourly_rate),
    supplier_rate: asNumber(row.supplier_rate),
    supplier_name: asText(row.supplier_name),
    payment_method: asText(row.payment_method) || 'WPS',
    joining_date: asText(row.joining_date),
    email: asText(row.email),
    whatsapp_number: asText(row.whatsapp_number),
    emirates_id: asText(row.emirates_id),
    emirates_id_expiry: asText(row.emirates_id_expiry),
    visa_number: asText(row.visa_number),
    visa_expiry: asText(row.visa_expiry),
    is_blacklisted: false,
  }
})

const seen = new Set()
const duplicateInFile = []
for (const row of records) {
  if (!row.worker_number) duplicateInFile.push(`line ${row.source_line}: missing worker_number`)
  else if (seen.has(row.worker_number)) duplicateInFile.push(`line ${row.source_line}: duplicate ${row.worker_number}`)
  seen.add(row.worker_number)
  if (row.category === 'Subcontract Worker' && !row.supplier_name) {
    duplicateInFile.push(`line ${row.source_line}: subcontract worker requires supplier_name`)
  }
}

if (duplicateInFile.length) {
  console.error(JSON.stringify({
    ok: false,
    file: basename(csvPath),
    duplicateInFile,
    duplicateInDb: [],
    message: 'Import stopped. Worker numbers are permanent and cannot be reused.',
  }, null, 2))
  process.exit(1)
}

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    mode: 'dry-run',
    file: basename(csvPath),
    rows: records.length,
    categories: records.reduce((acc, row) => ({ ...acc, [row.category]: (acc[row.category] || 0) + 1 }), {}),
    message: 'No data changed. Re-run with --apply to check live duplicates and import.',
  }, null, 2))
  process.exit(0)
}

loadEnv()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars')

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
const supplierNames = Array.from(new Set(records.map(row => row.supplier_name).filter(Boolean)))
const supplierByName = new Map()
if (supplierNames.length) {
  const { data: suppliers, error: supplierError } = await supabase
    .from('suppliers')
    .select('id, name, active')
    .in('name', supplierNames)
  if (supplierError) throw supplierError
  for (const supplier of suppliers || []) supplierByName.set(supplier.name, supplier)
  const missingSuppliers = supplierNames.filter(name => !supplierByName.has(name))
  const inactiveSuppliers = (suppliers || []).filter(row => row.active === false).map(row => row.name)
  if (missingSuppliers.length || inactiveSuppliers.length) {
    console.error(JSON.stringify({
      ok: false,
      file: basename(csvPath),
      missingSuppliers,
      inactiveSuppliers,
      message: 'Import stopped. Import or activate supplier companies before importing subcontract workers.',
    }, null, 2))
    process.exit(1)
  }
}

const { data: existing, error: existingError } = await supabase
  .from('workers')
  .select('worker_number')
  .in('worker_number', records.map(row => row.worker_number).filter(Boolean))
if (existingError) throw existingError

const duplicateInDb = (existing || []).map(row => row.worker_number)
if (duplicateInDb.length) {
  console.error(JSON.stringify({
    ok: false,
    file: basename(csvPath),
    duplicateInFile: [],
    duplicateInDb,
    message: 'Import stopped. Worker numbers are permanent and cannot be reused.',
  }, null, 2))
  process.exit(1)
}

const payload = records.map(({ source_line, supplier_name, ...row }) => ({
  ...row,
  supplier_id: supplier_name ? supplierByName.get(supplier_name)?.id || null : null,
}))
const { data, error } = await supabase.from('workers').insert(payload).select('id, worker_number, full_name')
if (error) throw error

console.log(JSON.stringify({
  ok: true,
  mode: 'apply',
  imported: data.length,
  first: data[0] || null,
  last: data[data.length - 1] || null,
}, null, 2))

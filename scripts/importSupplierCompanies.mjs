// Import supplier companies and their first agreed rate.
// Run:
//   node scripts/importSupplierCompanies.mjs import-templates/suppliers.csv --dry-run
//   node scripts/importSupplierCompanies.mjs import-templates/suppliers.csv --apply

import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const csvPath = process.argv[2]
const apply = process.argv.includes('--apply')
const dryRun = process.argv.includes('--dry-run') || !apply

if (!csvPath) {
  console.error('Missing CSV path. Example: node scripts/importSupplierCompanies.mjs suppliers.csv --dry-run')
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

function asText(value) {
  const text = String(value || '').trim()
  return text || null
}

function asNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const text = readFileSync(resolve(csvPath), 'utf8')
const [headersRaw, ...body] = parseCsv(text)
const headers = headersRaw.map(h => h.trim())
const required = ['name']
const missing = required.filter(col => !headers.includes(col))
if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`)

const records = body.map((cells, index) => {
  const row = Object.fromEntries(headers.map((header, i) => [header, cells[i] || '']))
  return {
    source_line: index + 2,
    name: asText(row.name),
    trade_speciality: asText(row.trade_speciality),
    contact_person: asText(row.contact_person),
    email: asText(row.email),
    phone: asText(row.phone),
    address: asText(row.address),
    po_number: asText(row.po_number),
    po_value: asNumber(row.po_value),
    po_start_date: asText(row.po_start_date),
    po_end_date: asText(row.po_end_date),
    payment_terms: asText(row.payment_terms) || '30 days',
    notes: asText(row.notes),
    first_trade_role: asText(row.first_trade_role),
    first_hourly_rate: asNumber(row.first_hourly_rate),
    first_effective_from: asText(row.first_effective_from),
  }
})

const seen = new Set()
const problems = []
for (const row of records) {
  const key = String(row.name || '').toLowerCase()
  if (!row.name) problems.push(`line ${row.source_line}: missing name`)
  else if (seen.has(key)) problems.push(`line ${row.source_line}: duplicate supplier ${row.name}`)
  seen.add(key)
  if ((row.first_trade_role && row.first_hourly_rate == null) || (!row.first_trade_role && row.first_hourly_rate != null)) {
    problems.push(`line ${row.source_line}: first_trade_role and first_hourly_rate must be supplied together`)
  }
}

if (problems.length) {
  console.error(JSON.stringify({ ok: false, file: basename(csvPath), problems }, null, 2))
  process.exit(1)
}

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    mode: 'dry-run',
    file: basename(csvPath),
    rows: records.length,
    rates: records.filter(row => row.first_trade_role && row.first_hourly_rate != null).length,
    message: 'No data changed. Re-run with --apply to check live duplicates and import.',
  }, null, 2))
  process.exit(0)
}

loadEnv()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars')

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
const { data: existing, error: existingError } = await supabase
  .from('suppliers')
  .select('name')
  .in('name', records.map(row => row.name).filter(Boolean))
if (existingError) throw existingError

const duplicateInDb = (existing || []).map(row => row.name)
if (duplicateInDb.length) {
  console.error(JSON.stringify({
    ok: false,
    file: basename(csvPath),
    duplicateInDb,
    message: 'Import stopped. Supplier names already exist.',
  }, null, 2))
  process.exit(1)
}

const suppliersPayload = records.map(({ source_line, first_trade_role, first_hourly_rate, first_effective_from, ...row }) => ({
  ...row,
  active: true,
}))
const { data: suppliers, error } = await supabase.from('suppliers').insert(suppliersPayload).select('*')
if (error) throw error

const supplierByName = new Map((suppliers || []).map(row => [row.name, row]))
const ratePayload = records
  .filter(row => row.first_trade_role && row.first_hourly_rate != null)
  .map(row => ({
    supplier_id: supplierByName.get(row.name)?.id,
    trade_role: row.first_trade_role,
    hourly_rate: row.first_hourly_rate,
    effective_from: row.first_effective_from || new Date().toISOString().split('T')[0],
    notes: 'Imported opening supplier rate',
  }))
  .filter(row => row.supplier_id)

let rates = []
if (ratePayload.length) {
  const rateResult = await supabase.from('supplier_rates').insert(ratePayload).select('*')
  if (rateResult.error) throw rateResult.error
  rates = rateResult.data || []
}

console.log(JSON.stringify({
  ok: true,
  mode: 'apply',
  imported_suppliers: suppliers.length,
  imported_rates: rates.length,
}, null, 2))

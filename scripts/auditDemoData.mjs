// Reports likely demo/test data without deleting anything.
// Run: node scripts/auditDemoData.mjs

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

function loadEnv() {
  const text = readFileSync(resolve(projectRoot, '.env.local'), 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and Supabase key in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const suspiciousText = [
  'demo',
  'test',
  'sample',
  'placeholder',
  'qqq',
  'asas',
  '222',
  'Supplier Company',
]

function textLooksDemo(value) {
  const text = String(value || '').toLowerCase()
  return suspiciousText.some(marker => text.includes(marker.toLowerCase()))
}

function rowLooksDemo(row, fields) {
  return fields.some(field => textLooksDemo(row[field]))
}

async function readTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select)
  if (error) return { rows: [], error: error.message }
  return { rows: data || [], error: null }
}

function printSection(title, rows, fields) {
  console.log(`\n=== ${title} (${rows.length}) ===`)
  if (!rows.length) {
    console.log('None found')
    return
  }
  for (const row of rows.slice(0, 50)) {
    console.log(fields.map(field => `${field}: ${row[field] ?? '-'}`).join(' | '))
  }
  if (rows.length > 50) console.log(`...and ${rows.length - 50} more`)
}

const workersResult = await readTable('workers', 'id, worker_number, full_name, first_name, last_name, status, category, entry_track, supplier_id, passport_number')
const suppliersResult = await readTable('suppliers', 'id, name, po_number, notes, active')
const documentsResult = await readTable('documents', 'id, worker_id, doc_type, label, file_url, status, notes')
const headersResult = await readTable('timesheet_headers', 'id, client_name, month, year, month_label, status')
const offboardingResult = await readTable('offboarding', 'id, worker_id, reason, last_working_date, file_closed_at, eos_amount')
const payrollResult = await readTable('payroll_batches', 'id, month, year, month_label, status, total_net')

const workers = workersResult.rows
const suppliers = suppliersResult.rows
const documents = documentsResult.rows
const headers = headersResult.rows
const offboarding = offboardingResult.rows
const payrollBatches = payrollResult.rows

const demoWorkers = workers.filter(row => {
  const name = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`
  return row.worker_number?.startsWith('DEMO-')
    || rowLooksDemo({ ...row, name }, ['worker_number', 'name', 'passport_number'])
})

const supplierWorkerIssues = workers.filter(row =>
  row.category === 'Subcontract Worker' && !row.supplier_id
)

const demoSuppliers = suppliers.filter(row =>
  row.name?.startsWith('DEMO-') || rowLooksDemo(row, ['name', 'po_number', 'notes'])
)

const demoDocuments = documents.filter(row =>
  row.file_url?.includes('demo://') || rowLooksDemo(row, ['label', 'file_url', 'notes'])
)

const demoHeaders = headers.filter(row =>
  row.month_label?.startsWith('DEMO-') || rowLooksDemo(row, ['client_name', 'month_label'])
)

printSection('Likely demo/test workers', demoWorkers, ['worker_number', 'full_name', 'status', 'category', 'entry_track'])
printSection('Subcontract workers missing supplier_id', supplierWorkerIssues, ['worker_number', 'full_name', 'status', 'category', 'entry_track'])
printSection('Likely demo/test suppliers', demoSuppliers, ['name', 'po_number', 'active'])
printSection('Likely demo/test documents', demoDocuments, ['doc_type', 'label', 'status', 'file_url'])
printSection('Likely demo/test timesheet headers', demoHeaders, ['client_name', 'month_label', 'status'])

console.log('\n=== Counts ===')
console.log(`workers: ${workers.length}`)
console.log(`suppliers: ${suppliers.length}`)
console.log(`documents: ${documents.length}`)
console.log(`timesheet_headers: ${headers.length}`)
console.log(`payroll_batches: ${payrollBatches.length}`)
console.log(`offboarding: ${offboarding.length}`)

console.log('\nNo data was changed.')

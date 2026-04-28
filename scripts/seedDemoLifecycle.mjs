// Creates a small end-to-end demo lifecycle without deleting anything.
// Run only in development/preview databases:
//   node scripts/seedDemoLifecycle.mjs

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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const DEMO_MONTH = 1
const DEMO_YEAR = 2027
const DEMO_MONTH_LABEL = `DEMO January ${DEMO_YEAR}`

const templates = {
  direct_staff: [
    ['passport_copy', 'Passport Copy', true],
    ['passport_photo', 'Passport Photo', true],
    ['medical_fitness', 'Medical Fitness', true],
    ['emirates_id', 'Emirates ID', true],
    ['uae_visa', 'UAE Visa', true],
    ['health_insurance', 'Health Insurance', true],
    ['workmen_compensation', "Workmen's Compensation (WC)", true],
    ['employment_contract', 'Employment Contract', false],
  ],
  contract_worker: [
    ['passport_copy', 'Passport Copy', true],
    ['emirates_id', 'ID Copy (Emirates ID)', true],
    ['workmen_compensation', "Workmen's Compensation (WC)", true],
    ['uae_visa', 'Passport Visa Copy', true],
  ],
  subcontractor_company_worker: [
    ['passport_copy', 'Passport Copy', true],
    ['passport_photo', 'Passport Photo', true],
    ['uae_visa', 'UAE Visa (employer-sponsored)', true],
    ['emirates_id', 'Emirates ID / National ID', true],
    ['health_insurance', 'Health Insurance (employer)', true],
    ['workmen_compensation', "Workmen's Compensation (WC)", true],
  ],
}

function dateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function upsertBy(table, match, payload) {
  const query = supabase.from(table).select('*')
  Object.entries(match).forEach(([key, value]) => query.eq(key, value))
  const { data: existing, error: readError } = await query.maybeSingle()
  if (readError && readError.code !== 'PGRST116') throw readError
  if (existing) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', existing.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from(table).insert([{ ...match, ...payload }]).select().single()
  if (error) throw error
  return data
}

async function ensureSupplier() {
  const supplier = await upsertBy('suppliers', { name: 'DEMO Apex Manpower Services LLC' }, {
    contact_person: 'Demo Coordinator',
    email: 'demo.supplier@example.com',
    phone: '+971 50 000 0000',
    trade_speciality: 'Demo scaffolding and rigging',
    po_number: 'DEMO-PO-2027-001',
    po_value: 50000,
    po_start_date: dateStr(2027, 1, 1),
    po_end_date: dateStr(2027, 12, 31),
    payment_terms: '30 days',
    active: true,
    notes: 'DEMO DATA - safe to remove before production',
  })

  for (const [trade, rate] of [['Scaffolder', 22], ['Rigger', 26]]) {
    await upsertBy('supplier_rates', { supplier_id: supplier.id, trade_role: trade, effective_from: dateStr(2027, 1, 1) }, {
      hourly_rate: rate,
      notes: 'DEMO DATA - initial supplier rate',
    })
  }
  return supplier
}

async function ensureClient() {
  return upsertBy('clients', { name: 'DEMO Client Project Site' }, {
    contact_person: 'Demo Site Manager',
    email: 'demo.client@example.com',
    phone: '+971 2 000 0000',
    active: true,
    is_internal: false,
  })
}

async function ensureWorker(row) {
  const worker = await upsertBy('workers', { worker_number: row.worker_number }, {
    first_name: row.first_name,
    last_name: row.last_name,
    nationality: row.nationality,
    date_of_birth: row.date_of_birth,
    passport_number: row.passport_number,
    passport_expiry: row.passport_expiry,
    emirates_id: row.emirates_id,
    emirates_id_expiry: row.emirates_id_expiry,
    visa_expiry: row.visa_expiry,
    trade_role: row.trade_role,
    category: row.category,
    status: row.status,
    entry_track: row.entry_track,
    supplier_id: row.supplier_id || null,
    supplier_rate: row.supplier_rate || null,
    monthly_salary: row.monthly_salary || 0,
    hourly_rate: row.hourly_rate || 0,
    payment_method: row.payment_method || 'WPS',
    c3_status: row.c3_status || 'Pending',
    joining_date: row.joining_date,
    rest_day: row.rest_day || 'sunday',
    email: row.email || null,
    whatsapp_number: row.whatsapp_number || null,
  })
  await ensureDocuments(worker)
  return worker
}

async function ensureDocuments(worker) {
  const template = templates[worker.entry_track] || templates.contract_worker
  const expiry = dateStr(2028, 12, 31)
  for (const [docType, label, isBlocking] of template) {
    await upsertBy('documents', { worker_id: worker.id, doc_type: docType }, {
      label,
      status: 'valid',
      is_blocking: isBlocking,
      file_url: `demo://documents/${worker.worker_number}/${docType}.pdf`,
      expiry_date: docType === 'passport_photo' || docType === 'medical_fitness' || docType === 'employment_contract' ? null : expiry,
      highlighted_name_confirmed: docType === 'workmen_compensation',
      doc_subtype: docType === 'workmen_compensation' ? 'highlighted_page' : null,
      notes: 'DEMO DATA - generated by seedDemoLifecycle.mjs',
    })
  }
}

async function ensureTimesheets(client, workers) {
  const header = await upsertBy('timesheet_headers', {
    client_name: client.name,
    month: DEMO_MONTH,
    year: DEMO_YEAR,
  }, {
    client_id: client.id,
    month_label: DEMO_MONTH_LABEL,
    status: 'hr_approved',
    ramadan_mode: false,
  })

  const workDays = Array.from({ length: 31 }, (_, i) => i + 1)
  for (const worker of workers) {
    for (const day of workDays) {
      const date = new Date(Date.UTC(DEMO_YEAR, DEMO_MONTH - 1, day))
      const dow = date.getUTCDay()
      const isSunday = dow === 0
      const hours = isSunday ? 0 : 8
      if (!hours) continue
      await upsertBy('timesheet_lines', {
        header_id: header.id,
        worker_id: worker.id,
        work_date: dateStr(DEMO_YEAR, DEMO_MONTH, day),
      }, {
        normal_hours: hours,
        ot_hours: 0,
        holiday_hours: 0,
        total_hours: hours,
        is_friday: dow === 5,
        is_rest_day: false,
        is_public_holiday: false,
        absence_status: null,
      })
    }
  }
  return header
}

async function ensurePayroll() {
  const { data: existing } = await supabase
    .from('payroll_batches')
    .select('id')
    .eq('month', DEMO_MONTH)
    .eq('year', DEMO_YEAR)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data, error } = await supabase.rpc('generate_payroll_batch', {
    p_month: DEMO_MONTH,
    p_year: DEMO_YEAR,
    p_month_label: DEMO_MONTH_LABEL,
  })
  if (error) throw error
  return data
}

async function ensureOffboarding(worker) {
  const existing = await supabase
    .from('offboarding')
    .select('id')
    .eq('worker_id', worker.id)
    .maybeSingle()

  if (existing.data?.id) return existing.data.id

  const { data, error } = await supabase.from('offboarding').insert([{
    worker_id: worker.id,
    reason: 'Resignation',
    last_working_date: dateStr(2027, 1, 31),
    medical_insurance_cancelled: true,
    c3_card_cancelled: true,
    final_payslip_issued: true,
    eos_approved: true,
    exit_clearance_signed: true,
    visa_cancellation_initiated: true,
    labour_card_cancelled: true,
    eos_amount: 1250,
  }]).select().single()
  if (error) throw error
  return data.id
}

console.log('Creating demo lifecycle data...')

const supplier = await ensureSupplier()
const client = await ensureClient()

const workers = []
workers.push(await ensureWorker({
  worker_number: 'DEMO-2027-0001',
  first_name: 'Demo',
  last_name: 'Supervisor',
  nationality: 'Indian',
  date_of_birth: '1990-01-10',
  passport_number: 'DEMO-PASS-0001',
  passport_expiry: '2029-01-10',
  emirates_id: '784-1990-1234567-1',
  emirates_id_expiry: '2028-01-10',
  visa_expiry: '2028-01-10',
  trade_role: 'Scaffolding Supervisor',
  category: 'Permanent Staff',
  status: 'active',
  entry_track: 'direct_staff',
  monthly_salary: 3000,
  payment_method: 'WPS',
  c3_status: 'Active',
  joining_date: '2027-01-01',
}))

workers.push(await ensureWorker({
  worker_number: 'DEMO-2027-0002',
  first_name: 'Demo',
  last_name: 'Welder',
  nationality: 'Pakistani',
  date_of_birth: '1992-02-12',
  passport_number: 'DEMO-PASS-0002',
  passport_expiry: '2029-02-12',
  emirates_id: '784-1992-1234567-2',
  emirates_id_expiry: '2028-02-12',
  visa_expiry: '2028-02-12',
  trade_role: 'Welder (GMAW)',
  category: 'Contract Worker',
  status: 'active',
  entry_track: 'contract_worker',
  hourly_rate: 22,
  payment_method: 'Non-WPS',
  c3_status: 'Active',
  joining_date: '2027-01-01',
}))

workers.push(await ensureWorker({
  worker_number: 'DEMO-2027-0003',
  first_name: 'Demo',
  last_name: 'Supplier Rigger',
  nationality: 'Nepali',
  date_of_birth: '1994-03-14',
  passport_number: 'DEMO-PASS-0003',
  passport_expiry: '2029-03-14',
  emirates_id: '784-1994-1234567-3',
  emirates_id_expiry: '2028-03-14',
  visa_expiry: '2028-03-14',
  trade_role: 'Rigger',
  category: 'Subcontract Worker',
  status: 'active',
  entry_track: 'subcontractor_company_worker',
  supplier_id: supplier.id,
  supplier_rate: 26,
  hourly_rate: 26,
  payment_method: 'Non-WPS',
  c3_status: 'Not required',
  joining_date: '2027-01-01',
}))

await ensureTimesheets(client, workers)
const batchId = await ensurePayroll()
const offboardingId = await ensureOffboarding(workers[1])

console.log('\nDemo lifecycle ready.')
console.log(`Supplier: ${supplier.name}`)
console.log(`Client: ${client.name}`)
console.log(`Workers: ${workers.map(w => w.worker_number).join(', ')}`)
console.log(`Payroll batch: ${batchId}`)
console.log(`Offboarding record: ${offboardingId}`)
console.log('\nNo existing data was deleted.')

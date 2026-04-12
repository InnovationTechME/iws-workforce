// Seeds mock workers into Supabase. Run:  node scripts/seedWorkers.mjs
// Uses service role key to bypass RLS. Skips rows that already exist.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// ── Load .env.local manually (no dotenv dep) ──────────────
const envPath = resolve(projectRoot, '.env.local')
const envText = readFileSync(envPath, 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

// ── Load mock workers by reading the file and evaluating the array literal ──
const mockPath = resolve(projectRoot, 'data/mockWorkers.js')
const mockText = readFileSync(mockPath, 'utf8')
// File format: `const mockWorkers = [ ... ]\nexport default mockWorkers`
const startIdx = mockText.indexOf('[')
const endIdx = mockText.lastIndexOf(']')
if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate mockWorkers array literal')
  process.exit(1)
}
const arrayLiteral = mockText.slice(startIdx, endIdx + 1)
// Safe eval of the object-literal array (Function constructor in this controlled context)
const mockWorkers = Function('"use strict"; return (' + arrayLiteral + ')')()

if (!Array.isArray(mockWorkers) || mockWorkers.length === 0) {
  console.error('mockWorkers did not parse to a non-empty array')
  process.exit(1)
}

// ── Helpers ──────────────────────────────────────────────
const splitName = (fullName) => {
  const parts = (fullName || '').trim().split(/\s+/)
  if (parts.length === 0) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

// DB has a check constraint on subcontractor_type. Mock data doesn't map to
// a recognised enum value, so leave null. Populate when Supabase phase defines
// the allowed enum values.
const subcontractorType = (_w) => null

const mapC3 = (v) => {
  if (!v) return 'Not set'
  if (v === 'active') return 'Active'
  if (v === 'pending') return 'Pending'
  if (v === 'not_required') return 'Not required'
  return String(v)
}

const mapStatus = (s, active) => {
  const raw = (s || (active ? 'Active' : 'Inactive')).toLowerCase().trim()
  if (raw === 'active') return 'active'
  if (raw === 'on leave' || raw === 'on_leave') return 'on_leave'
  if (raw === 'onboarding') return 'onboarding'
  if (raw === 'inactive' || raw === 'closed') return 'inactive'
  return 'active'
}

const mapRow = (w) => {
  const { first_name, last_name } = splitName(w.full_name)
  return {
    worker_number: w.worker_number,
    first_name,
    last_name,
    nationality: w.nationality || null,
    passport_number: w.passport_number || null,
    passport_expiry: w.passport_expiry || null,
    trade_role: w.trade_role || null,
    category: w.category || null,
    status: mapStatus(w.status, w.active),
    monthly_salary: w.monthly_salary || 0,
    hourly_rate: w.hourly_rate || 0,
    housing_allowance: w.housing_allowance || 0,
    transport_allowance: w.transport_allowance || 0,
    food_allowance: w.food_allowance || 0,
    other_allowance: w.other_allowance || 0,
    payment_method: w.payment_method || 'WPS',
    c3_status: mapC3(w.c3_card_status),
    endered_id: w.endered_id || null,
    joining_date: w.joining_date || null,
    probation_end_date: w.probation_end_date || null,
    contract_end_date: w.contract_end_date || w.visa_expiry || null,
    iloe_deducted: false,
    email: w.email || null,
    whatsapp_number: w.whatsapp_number || w.mobile_number || null,
    subcontractor_type: subcontractorType(w),
    is_blacklisted: !!w.blacklisted
  }
}

// ── Fetch existing worker_numbers to skip duplicates ──────
const { data: existingRows, error: existErr } = await supabase
  .from('workers')
  .select('worker_number')
if (existErr) {
  console.error('Failed to read existing workers:', existErr.message)
  process.exit(1)
}
const existing = new Set((existingRows || []).map(r => r.worker_number))

// ── Insert one at a time so we can log per-row outcome ───
let okCount = 0
let skipCount = 0
let errCount = 0

for (const mock of mockWorkers) {
  const row = mapRow(mock)
  const wn = row.worker_number
  if (existing.has(wn)) {
    console.log(`SKIP  ${wn}  already exists`)
    skipCount++
    continue
  }
  const { error } = await supabase.from('workers').insert([row])
  if (error) {
    console.log(`ERROR ${wn}  ${error.message}`)
    errCount++
  } else {
    console.log(`OK    ${wn}  ${mock.full_name}`)
    okCount++
  }
}

// ── Verify final count ────────────────────────────────────
const { count: totalCount, error: countErr } = await supabase
  .from('workers')
  .select('*', { count: 'exact', head: true })

console.log('\n──────────────────────────────────────────────')
console.log(`Inserted: ${okCount}   Skipped: ${skipCount}   Errors: ${errCount}`)
if (!countErr) console.log(`Total rows in Supabase workers table: ${totalCount}`)
console.log('──────────────────────────────────────────────')

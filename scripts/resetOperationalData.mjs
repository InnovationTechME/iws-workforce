// Safe operational reset helper.
//
// Default mode is a dry run:
//   npm run data:reset-plan
//
// Full operational reset requires all of the following:
//   $env:IWS_ALLOW_FACTORY_RESET="true"
//   npm run data:reset-operational -- --confirm=RESET-IWS-OPERATIONAL-DATA
//
// This keeps reference/setup data such as public_holidays and payroll rules.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const OPERATIONAL_TABLES_DELETE_ORDER = [
  'attendance_conflicts',
  'attendance',
  'timesheet_discrepancies',
  'timesheet_lines',
  'timesheet_headers',
  'payroll_adjustments',
  'payroll_lines',
  'payroll_batches',
  'document_deliveries',
  'supplier_summary_lines',
  'supplier_summaries',
  'supplier_timesheet_summaries',
  'offboarding',
  'onboarding',
  'letters',
  'warnings',
  'offers',
  'certifications',
  'documents',
  'work_experience',
  'workers',
  'supplier_rates',
  'suppliers',
  'clients',
]

function loadEnv() {
  const text = readFileSync(resolve(projectRoot, '.env.local'), 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

function argValue(name) {
  const prefix = `--${name}=`
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length)
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const destructive = process.argv.includes('--all-operational')
const confirmText = argValue('confirm')

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

async function tableCount(table) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })

  if (error) return { table, count: null, error: error.message }
  return { table, count: count || 0, error: null }
}

async function deleteTable(table) {
  const { error } = await supabase
    .from(table)
    .delete()
    .not('id', 'is', null)

  if (error) return { table, ok: false, error: error.message }
  return { table, ok: true, error: null }
}

const counts = []
for (const table of OPERATIONAL_TABLES_DELETE_ORDER) {
  counts.push(await tableCount(table))
}

console.log('\nIWS operational reset plan')
console.log('Mode:', destructive ? 'DESTRUCTIVE REQUESTED' : 'DRY RUN')
console.log('\nTables that would be cleared, in dependency order:')
for (const row of counts) {
  const suffix = row.error ? `skip/read error: ${row.error}` : `${row.count} row(s)`
  console.log(`- ${row.table}: ${suffix}`)
}

console.log('\nReference data intentionally kept: public_holidays, rule/config tables, document type definitions, and storage buckets.')

if (!destructive) {
  console.log('\nNo data was changed. This was a dry run.')
  process.exit(0)
}

if (process.env.IWS_ALLOW_FACTORY_RESET !== 'true' || confirmText !== 'RESET-IWS-OPERATIONAL-DATA') {
  console.error('\nReset blocked. To run a destructive reset, set IWS_ALLOW_FACTORY_RESET=true and pass --confirm=RESET-IWS-OPERATIONAL-DATA.')
  process.exit(1)
}

console.log('\nStarting destructive operational reset...')
for (const table of OPERATIONAL_TABLES_DELETE_ORDER) {
  const result = await deleteTable(table)
  if (result.ok) console.log(`cleared ${table}`)
  else console.log(`skipped ${table}: ${result.error}`)
}

console.log('\nOperational reset complete. Run npm run data:audit, then seed a new demo or start entering real records.')

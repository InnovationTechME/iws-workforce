// Seeds reference data into Supabase:
//   public_holidays · blacklist · clients
// Run:  node scripts/seedReferenceData.mjs
// Uses service role key to bypass RLS. Skips rows that already exist.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// ── Load .env.local manually ──────────────────────────────
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

// ── Helper: parse an `export const xxx = [ ... ]` array literal from a file ──
function extractArrayLiteral(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const startIdx = text.indexOf('[')
  const endIdx = text.lastIndexOf(']')
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No array literal found in ' + filePath)
  }
  const literal = text.slice(startIdx, endIdx + 1)
  return Function('"use strict"; return (' + literal + ')')()
}

// ════════════════════════════════════════════════════════
// 1) PUBLIC HOLIDAYS
// ════════════════════════════════════════════════════════
async function seedPublicHolidays() {
  console.log('\n=== public_holidays ===')
  const holidays = extractArrayLiteral(resolve(projectRoot, 'data/mockPublicHolidays.js'))

  // Read existing by date to avoid duplicates
  const { data: existingRows, error: readErr } = await supabase
    .from('public_holidays')
    .select('date')
  if (readErr) {
    console.log('ERROR reading public_holidays: ' + readErr.message)
    return
  }
  const existing = new Set((existingRows || []).map(r => r.date))

  let ok = 0, skip = 0, err = 0
  for (const h of holidays) {
    const date = h.date
    if (existing.has(date)) {
      console.log(`SKIP  ${date}  ${h.name}`)
      skip++
      continue
    }
    const row = {
      name: h.name,
      date,
      year: new Date(date).getFullYear()
    }
    const { error } = await supabase.from('public_holidays').insert([row])
    if (error) {
      console.log(`ERROR ${date}  ${error.message}`)
      err++
    } else {
      console.log(`OK    ${date}  ${h.name}`)
      ok++
    }
  }
  console.log(`public_holidays: ${ok} inserted · ${skip} skipped · ${err} errors`)
}

// ════════════════════════════════════════════════════════
// 2) BLACKLIST
// ════════════════════════════════════════════════════════
async function seedBlacklist() {
  console.log('\n=== blacklist ===')
  const rows = extractArrayLiteral(resolve(projectRoot, 'data/mockBlacklist.js'))

  const { data: existingRows, error: readErr } = await supabase
    .from('blacklist')
    .select('passport_number')
  if (readErr) {
    console.log('ERROR reading blacklist: ' + readErr.message)
    return
  }
  const existing = new Set(
    (existingRows || [])
      .map(r => r.passport_number?.toLowerCase())
      .filter(Boolean)
  )

  let ok = 0, skip = 0, err = 0
  for (const b of rows) {
    const pn = b.passport_number
    if (existing.has(pn?.toLowerCase())) {
      console.log(`SKIP  ${pn}  ${b.full_name}`)
      skip++
      continue
    }
    const row = {
      passport_number: pn,
      full_name: b.full_name,
      nationality: b.nationality || null,
      reason: b.reason || null,
      added_by: b.blacklisted_by || 'HR Admin'
    }
    const { error } = await supabase.from('blacklist').insert([row])
    if (error) {
      console.log(`ERROR ${pn}  ${error.message}`)
      err++
    } else {
      console.log(`OK    ${pn}  ${b.full_name}`)
      ok++
    }
  }
  console.log(`blacklist: ${ok} inserted · ${skip} skipped · ${err} errors`)
}

// ════════════════════════════════════════════════════════
// 3) CLIENTS — realistic Abu Dhabi industrial clients
// derived from mockClients.js + mockTimesheets.js + common IWS clients
// ════════════════════════════════════════════════════════
async function seedClients() {
  console.log('\n=== clients ===')

  const clients = [
    {
      name: 'Abu Dhabi Ship Building (ADSB)',
      contact_person: 'Khalifa Al Mansouri — Project Manager',
      email: 'projects@adsb.ae',
      phone: '+971 2 502 8888',
      active: true
    },
    {
      name: 'Gulf Marine Engineering LLC',
      contact_person: 'Ravi Krishnan — Operations Manager',
      email: 'operations@gulfmarine.ae',
      phone: '+971 2 551 4200',
      active: true
    },
    {
      name: 'Harbor Fit-Out Contracting LLC',
      contact_person: 'Ahmed Al Suwaidi — Site Engineer',
      email: 'siteops@harborfitout.ae',
      phone: '+971 2 677 3310',
      active: true
    },
    {
      name: 'ADNOC Offshore Contractors',
      contact_person: 'Mohammed Al Hosani — Contracts Lead',
      email: 'contracts@adnocoffshore.ae',
      phone: '+971 2 606 0000',
      active: true
    }
  ]

  const { data: existingRows, error: readErr } = await supabase
    .from('clients')
    .select('name')
  if (readErr) {
    console.log('ERROR reading clients: ' + readErr.message)
    return
  }
  const existing = new Set((existingRows || []).map(r => r.name?.toLowerCase()))

  let ok = 0, skip = 0, err = 0
  for (const c of clients) {
    if (existing.has(c.name.toLowerCase())) {
      console.log(`SKIP  ${c.name}`)
      skip++
      continue
    }
    const { error } = await supabase.from('clients').insert([c])
    if (error) {
      console.log(`ERROR ${c.name}  ${error.message}`)
      err++
    } else {
      console.log(`OK    ${c.name}`)
      ok++
    }
  }
  console.log(`clients: ${ok} inserted · ${skip} skipped · ${err} errors`)
}

// ════════════════════════════════════════════════════════
// Run all three in sequence
// ════════════════════════════════════════════════════════
await seedPublicHolidays()
await seedBlacklist()
await seedClients()

// ── Verify totals ─────────────────────────────────────
console.log('\n──────────────────────────────────────────────')
for (const table of ['public_holidays', 'blacklist', 'clients']) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) console.log(`${table}: ERROR reading count — ${error.message}`)
  else console.log(`${table}: ${count} total rows`)
}
console.log('──────────────────────────────────────────────')

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { initialiseWorkerDocuments } from '../lib/documentRegister.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const envText = readFileSync(resolve(projectRoot, '.env.local'), 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) { console.error('Missing env vars'); process.exit(1) }

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data: workers, error } = await supabase
  .from('workers')
  .select('id, worker_number, full_name, category, entry_track, status')
  .neq('status', 'inactive')
  .order('worker_number', { ascending: true })

if (error) { console.error('Failed to load workers:', error.message); process.exit(1) }

let totalCreated = 0
for (const w of workers) {
  const created = await initialiseWorkerDocuments(w, supabase)
  if (created > 0) {
    console.log(`${w.worker_number} ${w.full_name} — created ${created} document slots`)
    totalCreated += created
  } else {
    console.log(`${w.worker_number} ${w.full_name} — SKIP (already has docs)`)
  }
}

console.log(`\nDone. ${workers.length} workers processed, ${totalCreated} document rows created.`)

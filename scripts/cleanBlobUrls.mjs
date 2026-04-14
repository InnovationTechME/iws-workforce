import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const { data: dead, error: fetchError } = await supabase
  .from('documents')
  .select('id, doc_type, worker_id, workers(worker_number)')
  .like('file_url', 'blob:%')

if (fetchError) { console.error('Fetch failed:', fetchError.message); process.exit(1) }

if (!dead || dead.length === 0) {
  console.log('No blob URLs found — nothing to clean.')
  process.exit(0)
}

console.log(`Found ${dead.length} documents with dead blob URLs\n`)

let resetCount = 0
for (const d of dead) {
  const { error: updateError } = await supabase
    .from('documents')
    .update({ status: 'missing', file_url: null, uploaded_at: null, updated_at: new Date().toISOString() })
    .eq('id', d.id)
  if (updateError) {
    console.error(`FAILED ${d.workers?.worker_number || d.worker_id} ${d.doc_type}: ${updateError.message}`)
  } else {
    console.log(`Reset: ${d.workers?.worker_number || d.worker_id} ${d.doc_type}`)
    resetCount++
  }
}

console.log(`\nDone. ${resetCount} / ${dead.length} documents reset.`)

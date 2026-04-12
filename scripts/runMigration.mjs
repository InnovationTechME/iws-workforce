// Attempts to run a SQL migration against Supabase.
// Usage: node scripts/runMigration.mjs scripts/migrations/001_three_track_schema.sql
//
// Supabase service-role key cannot execute DDL via the standard PostgREST
// endpoint. This script tries the `exec_sql` RPC if installed; otherwise it
// prints clear instructions for the user to run the SQL manually in the
// Supabase SQL editor.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

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
if (!url || !serviceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const sqlPath = process.argv[2]
if (!sqlPath) { console.error('Usage: node scripts/runMigration.mjs <path-to-sql>'); process.exit(1) }
const sql = readFileSync(resolve(projectRoot, sqlPath), 'utf8')

// Try to execute via an `exec_sql` RPC (common Supabase pattern)
const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ sql })
})

if (res.ok) {
  console.log('✓ Migration executed successfully via exec_sql RPC.')
  process.exit(0)
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('⚠ Could not execute DDL automatically (HTTP ' + res.status + ')')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Supabase service-role key does not permit raw DDL via PostgREST.')
console.log('')
console.log('Run this SQL manually:')
console.log('  1. Open https://supabase.com/dashboard/project/' + url.split('//')[1].split('.')[0] + '/sql')
console.log('  2. Paste the contents of ' + sqlPath)
console.log('  3. Click "Run"')
console.log('')
console.log('After running the SQL, re-run:  node scripts/seedSuppliers.mjs')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
process.exit(2)

// Runs the three-track schema migrations against Supabase.
// Usage:  node scripts/runMigrations.mjs
//
// Attempts to execute raw DDL via Supabase. Since the anon/service-role keys
// only authorize PostgREST (which does not accept raw SQL), this probes several
// possible execution paths and reports results clearly.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// ── Load env ──────────────────────────────────────────────
const envText = readFileSync(resolve(projectRoot, '.env.local'), 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) { console.error('Missing env vars'); process.exit(1) }

// ── 7 migration statements in order ───────────────────────
const statements = [
  // 1
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS entry_track text CHECK (entry_track IN ('direct_staff', 'contract_worker', 'subcontractor_company_worker')) DEFAULT 'contract_worker';
   UPDATE workers SET entry_track = 'direct_staff' WHERE category IN ('Permanent Staff', 'Office Staff');
   UPDATE workers SET entry_track = 'contract_worker' WHERE category = 'Contract Worker';
   UPDATE workers SET entry_track = 'subcontractor_company_worker' WHERE category = 'Subcontract Worker';
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS supplier_id uuid;
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS supplier_rate numeric;`,
  // 2
  `CREATE TABLE IF NOT EXISTS suppliers (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     contact_person text,
     email text,
     phone text,
     address text,
     trade_speciality text,
     po_number text,
     po_value numeric DEFAULT 0,
     po_start_date date,
     po_end_date date,
     payment_terms text DEFAULT '30 days',
     active boolean DEFAULT true,
     notes text,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );`,
  // 3
  `ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS "service_role_all" ON suppliers;
   CREATE POLICY "service_role_all" ON suppliers FOR ALL TO public USING (true);`,
  // 4
  `CREATE TABLE IF NOT EXISTS supplier_rates (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
     trade_role text NOT NULL,
     hourly_rate numeric NOT NULL,
     effective_from date NOT NULL,
     effective_to date,
     notes text,
     created_at timestamptz DEFAULT now()
   );`,
  // 5
  `ALTER TABLE supplier_rates ENABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS "service_role_all" ON supplier_rates;
   CREATE POLICY "service_role_all" ON supplier_rates FOR ALL TO public USING (true);`,
  // 6
  `CREATE TABLE IF NOT EXISTS supplier_timesheet_summaries (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     supplier_id uuid REFERENCES suppliers(id),
     month integer CHECK (month >= 1 AND month <= 12),
     year integer,
     month_label text,
     total_workers integer DEFAULT 0,
     total_hours numeric DEFAULT 0,
     total_amount numeric DEFAULT 0,
     po_number text,
     status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'invoiced', 'paid')),
     sent_at timestamptz,
     sent_by text,
     invoice_received boolean DEFAULT false,
     invoice_number text,
     invoice_amount numeric,
     invoice_date date,
     notes text,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );`,
  // 7
  `ALTER TABLE supplier_timesheet_summaries ENABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS "service_role_all" ON supplier_timesheet_summaries;
   CREATE POLICY "service_role_all" ON supplier_timesheet_summaries FOR ALL TO public USING (true);`
]

// ── Attempt execution via Supabase `exec_sql` RPC ────────
// Some Supabase projects have a custom `exec_sql` function installed.
// Without it, raw DDL cannot be executed from the service-role PostgREST
// endpoint (by design — REST is SQL-injected behind the scenes).
const tryExecSql = async (sql) => {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  })
  return { ok: res.ok, status: res.status, text: await res.text().catch(() => '') }
}

console.log('Attempting to run migrations via exec_sql RPC ...\n')
let okCount = 0
let failStatement = null
for (let i = 0; i < statements.length; i++) {
  const sql = statements[i]
  const r = await tryExecSql(sql)
  if (r.ok) {
    console.log(`✓ Statement ${i + 1}/7 executed`)
    okCount++
  } else {
    console.log(`✗ Statement ${i + 1}/7 failed (HTTP ${r.status})`)
    if (!failStatement) failStatement = { i: i + 1, status: r.status, body: r.text }
    break
  }
}

if (okCount === statements.length) {
  console.log('\n✓ All migrations executed successfully.')

  // Seed the 5 placeholder suppliers (DML works via REST even without exec_sql RPC)
  const seedRes = await fetch(`${url}/rest/v1/suppliers?on_conflict=name`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify([
      { name: 'Supplier Company 1', trade_speciality: 'Scaffolding & Access', po_number: 'PO-2026-001', po_value: 0, po_start_date: '2026-01-01', po_end_date: '2026-12-31', payment_terms: '30 days', notes: 'Update with real company name and PO details' },
      { name: 'Supplier Company 2', trade_speciality: 'Marine & Rigging', po_number: 'PO-2026-002', po_value: 0, po_start_date: '2026-01-01', po_end_date: '2026-12-31', payment_terms: '30 days', notes: 'Update with real company name and PO details' },
      { name: 'Supplier Company 3', trade_speciality: 'Civil & Structural', po_number: 'PO-2026-003', po_value: 0, po_start_date: '2026-01-01', po_end_date: '2026-12-31', payment_terms: '30 days', notes: 'Update with real company name and PO details' },
      { name: 'Supplier Company 4', trade_speciality: 'Mechanical & Piping', po_number: 'PO-2026-004', po_value: 0, po_start_date: '2026-01-01', po_end_date: '2026-12-31', payment_terms: '30 days', notes: 'Update with real company name and PO details' },
      { name: 'Supplier Company 5', trade_speciality: 'Electrical & Instrumentation', po_number: 'PO-2026-005', po_value: 0, po_start_date: '2026-01-01', po_end_date: '2026-12-31', payment_terms: '30 days', notes: 'Update with real company name and PO details' }
    ])
  })
  console.log(`Supplier seed: HTTP ${seedRes.status}`)
  process.exit(0)
}

// ── Fallback: print manual instructions ──────────────────
const projectRef = url.split('//')[1].split('.')[0]
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('⚠  Automated DDL execution not available')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Supabase service-role keys authorize PostgREST (DML only).')
console.log('Raw DDL (CREATE TABLE, ALTER TABLE) requires one of:')
console.log('  • An `exec_sql` RPC pre-installed in the project')
console.log('  • Direct Postgres connection with DB password')
console.log('  • Supabase Management API Personal Access Token (PAT)')
console.log('')
console.log('None of those are available from .env.local alone.')
console.log('')
console.log('➜ Run the migration manually (one click):')
console.log(`   1. Open  https://supabase.com/dashboard/project/${projectRef}/sql/new`)
console.log('   2. Paste the contents of:')
console.log('      scripts/migrations/001_three_track_schema.sql')
console.log('   3. Click Run')
console.log('')
console.log('The SQL file is ready and idempotent (uses IF NOT EXISTS throughout).')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
process.exit(2)

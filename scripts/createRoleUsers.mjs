// Create Supabase Auth users for the IWS roles without putting passwords in git.
//
// Set the env vars you need, then run:
//   node scripts/createRoleUsers.mjs --dry-run
//   node scripts/createRoleUsers.mjs --apply
//
// Required pairs:
// IWS_OWNER_EMAIL / IWS_OWNER_PASSWORD
// IWS_HR_EMAIL / IWS_HR_PASSWORD
// IWS_OPERATIONS_EMAIL / IWS_OPERATIONS_PASSWORD
// IWS_ACCOUNTS_EMAIL / IWS_ACCOUNTS_PASSWORD

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')

function loadEnv() {
  try {
    const text = readFileSync(resolve('.env.local'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}

loadEnv()

const roles = [
  { role: 'owner', emailVar: 'IWS_OWNER_EMAIL', passwordVar: 'IWS_OWNER_PASSWORD' },
  { role: 'hr_admin', emailVar: 'IWS_HR_EMAIL', passwordVar: 'IWS_HR_PASSWORD' },
  { role: 'operations', emailVar: 'IWS_OPERATIONS_EMAIL', passwordVar: 'IWS_OPERATIONS_PASSWORD' },
  { role: 'accounts', emailVar: 'IWS_ACCOUNTS_EMAIL', passwordVar: 'IWS_ACCOUNTS_PASSWORD' },
]

const users = roles
  .map(row => ({ ...row, email: process.env[row.emailVar], password: process.env[row.passwordVar] }))
  .filter(row => row.email && row.password)

if (!users.length) {
  console.log(JSON.stringify({
    ok: true,
    mode: apply ? 'apply' : 'dry-run',
    message: 'No role user env vars found. Set IWS_*_EMAIL and IWS_*_PASSWORD values first.',
    expected: roles.map(row => [row.emailVar, row.passwordVar]),
  }, null, 2))
  process.exit(0)
}

if (!apply) {
  console.log(JSON.stringify({
    ok: true,
    mode: 'dry-run',
    users: users.map(row => ({ email: row.email, role: row.role })),
    message: 'No users created. Re-run with --apply.',
  }, null, 2))
  process.exit(0)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars')

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function closeSupabase() {
  try { supabase.realtime?.disconnect?.() } catch {}
}

const results = []
for (const user of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    app_metadata: { role: user.role },
  })
  results.push({
    email: user.email,
    role: user.role,
    ok: !error,
    user_id: data?.user?.id || null,
    error: error?.message || null,
  })
}

console.log(JSON.stringify({ ok: results.every(row => row.ok), results }, null, 2))
closeSupabase()

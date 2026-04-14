// Server-only Supabase client using the service-role key.
// Import this ONLY from server contexts (route handlers, server actions, server
// components, scripts). It bypasses RLS by design — never bundle it into a
// client component.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function lazyMissingServerClient() {
  const msg = 'Supabase server client not initialized: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  const thrower = () => { throw new Error(msg) }
  return new Proxy({}, { get: thrower, apply: thrower })
}

export const supabaseAdmin = (url && serviceKey)
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : lazyMissingServerClient()

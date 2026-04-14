import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Do not throw at module load. Next.js evaluates this file during build-time
// prerender, where env vars may be absent. Defer the error to actual usage so
// the build succeeds and runtime surfaces a clear, specific error.
function lazyMissingClient() {
  const msg = 'Supabase client not initialized: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  const thrower = () => { throw new Error(msg) }
  return new Proxy({}, { get: thrower, apply: thrower })
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : lazyMissingClient()

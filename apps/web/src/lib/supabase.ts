import { createClient } from '@supabase/supabase-js'
import type { Database } from '@vitalog/shared'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in apps/web/.env.local')
}

// PKCE: email links come back with a one-time ?code= that the client exchanges for a
// session on load (detectSessionInUrl), instead of putting tokens in the URL.
export const supabase = createClient<Database>(url, anonKey, {
  auth: { flowType: 'pkce' },
})

/** Absolute URL for an app path, used for links in auth emails. */
export function appUrl(path: string) {
  return new URL(path, window.location.origin).toString()
}

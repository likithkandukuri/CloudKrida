import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key || url.includes('YOUR_PROJECT')) {
  console.error(
    '[Krida] Supabase not configured.\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local\n' +
    'See SUPABASE_SETUP.md for instructions.'
  )
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'arena-auth-session',   // localStorage key (UI session only — not data)
  },
})

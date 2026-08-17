import { createClient } from '@supabase/supabase-js'

// Trimmed and shape-checked because these are pasted by hand into a host
// dashboard (Cloudflare Pages) and Vite inlines whatever it is handed at build
// time. A leading space plus a second variable pasted into the same field once
// shipped a live build whose only symptom was an opaque 401 "Invalid API key" on
// login — the values were present, so a truthiness check passed them straight
// through. Validate the shape here so that fails at startup instead.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check your .env file.')
}

if (!/^https:\/\/\S+$/.test(supabaseUrl)) {
  throw new Error(
    `VITE_SUPABASE_URL is malformed (${JSON.stringify(supabaseUrl)}) — it must be a single https URL with no whitespace.`,
  )
}

// Legacy anon key is a JWT; the newer publishable format is sb_publishable_*.
if (!/^(ey[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/.test(supabaseAnonKey)) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is not a single well-formed key — check for whitespace or another variable pasted into the same field.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

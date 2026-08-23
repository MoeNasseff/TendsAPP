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

/** Base URL for edge functions, for callers that invoke one over plain fetch
 *  rather than through `supabase.functions.invoke`. See callFunction(). */
export const functionsUrl = `${supabaseUrl}/functions/v1`

/**
 * Calls an edge function with only the two headers its CORS policy allows.
 *
 * `supabase.functions.invoke` additionally sends `apikey` and `x-client-info`.
 * Both are non-simple headers, so when a function's
 * `Access-Control-Allow-Headers` omits them the browser fails the preflight and
 * the request never leaves the page — surfacing as an opaque "failed to fetch"
 * that looks like a network fault rather than a config one. Going direct keeps
 * the call working regardless of which functions have been redeployed with a
 * widened allow-list.
 *
 * Returns the parsed body plus the Response, so callers can distinguish an
 * HTTP-level failure (which carries a structured error body) from a transport
 * failure (which does not).
 */
export async function callFunction(
  name: string,
  body: unknown,
): Promise<{ response: Response; data: unknown } | { response: null; data: null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { response: null, data: null }

  try {
    const response = await fetch(`${functionsUrl}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })
    let data: unknown = null
    try {
      data = await response.clone().json()
    } catch {
      // Non-JSON body — the caller falls back to its generic reason.
    }
    return { response, data }
  } catch {
    return { response: null, data: null }
  }
}

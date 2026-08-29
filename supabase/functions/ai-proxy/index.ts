// Server-side AI proxy. Both the managed path and the BYOK path go through
// here, so a provider key never reaches a browser.
//
// Invariants, in order of importance:
//   1. The caller's JWT is verified before anything else happens -- no body
//      parse, no secret read, no upstream call above that line.
//   2. The user id comes from the verified JWT, never from the request body.
//   3. No provider key appears in a response body, an error message, or a
//      log line. Upstream error bodies are never forwarded.
//
// Gemini surface checked against ai.google.dev on 2026-08-16: it is
// POST /v1beta/interactions with a flat `input` array and `response_format`
// -- NOT models/{model}:generateContent with contents[].parts[] and
// generationConfig. This API has changed repeatedly; re-read the docs
// before editing rather than trusting this comment.
import { createClient } from 'npm:@supabase/supabase-js@2'

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const DEFAULT_MODEL = 'gemini-3.7-flash'
const ALLOWED_PROVIDERS = new Set(['gemini'])
// Gemini caps a request carrying inline image data at 20MB; stay under it.
const MAX_BODY_BYTES = 15 * 1024 * 1024

// `*` is deliberate. This endpoint is authorised by a bearer JWT that the
// browser never attaches automatically -- there is no cookie or ambient
// credential for a hostile origin to ride. CORS is therefore not the
// security boundary here, the JWT check is, and an origin allowlist would
// only add a deploy-time way to break the app.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  // `apikey` and `x-client-info` are sent by supabase-js on every
  // functions.invoke call, and both are non-simple headers, so omitting them
  // makes the browser fail the preflight and the request never leaves the
  // page. That surfaced as a "Could not reach the service" transport error
  // that looked like a network or key problem — the proxy itself answered a
  // hand-rolled fetch with those headers absent perfectly well. Keep this
  // list in sync with whatever supabase-js sends.
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // ---- 1. Authenticate. Nothing else happens first. --------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userRes, error: authError } = await authClient.auth.getUser()
  const user = userRes?.user
  if (authError || !user) return json({ error: 'unauthorized' }, 401)

  // ---- 2. Read and validate the request. -------------------------------
  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413)

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413)

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const provider = typeof body.provider === 'string' ? body.provider : ''
  if (!ALLOWED_PROVIDERS.has(provider)) return json({ error: 'unknown_provider' }, 400)

  const keySource = body.key_source
  if (keySource !== 'byok' && keySource !== 'managed') return json({ error: 'bad_request' }, 400)

  const input = body.input
  if (!Array.isArray(input) || input.length === 0) return json({ error: 'bad_request' }, 400)

  const requestedModel = typeof body.model === 'string' && body.model ? body.model : null
  let model = requestedModel ?? DEFAULT_MODEL

  // ---- 3. Resolve the key. ---------------------------------------------
  let apiKey: string | null = null
  // Hoisted so step 5 can stamp `last_used_at` on the same client after a
  // successful call, without re-authenticating as service_role twice.
  let admin: ReturnType<typeof createClient> | null = null

  if (keySource === 'byok') {
    // service_role is the only role that can select `api_key` -- see
    // 20260816000002_ai_provider_configs.sql. Scoped to the id from the
    // verified JWT above, never to anything the caller sent.
    admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: config } = await admin
      .from('ai_provider_configs')
      .select('api_key, model')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('enabled', true)
      .maybeSingle()

    if (!config?.api_key) return json({ error: 'byok_not_configured' }, 403)
    apiKey = config.api_key
    if (!requestedModel && config.model) model = config.model
  } else {
    apiKey = Deno.env.get('GEMINI_API_KEY') ?? null
    // Not a failure -- 'unavailable' is a correct outcome the client is
    // built to handle (see src/lib/ai/client.ts).
    if (!apiKey) return json({ error: 'unavailable' }, 503)
  }

  // ---- 4. Forward. ------------------------------------------------------
  const upstreamBody: Record<string, unknown> = { model, input }
  if (body.response_format) upstreamBody.response_format = body.response_format

  let upstream: Response
  try {
    upstream = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(upstreamBody),
    })
  } catch {
    // The thrown error is swallowed on purpose: fetch failures can carry the
    // request URL and headers, and the headers hold the key.
    console.error('ai-proxy: upstream unreachable')
    return json({ error: 'provider_unreachable' }, 502)
  }

  if (!upstream.ok) {
    // The upstream body is NOT forwarded and NOT logged. Provider error
    // payloads have historically echoed the key and the full request URL.
    console.error(`ai-proxy: ${provider} returned ${upstream.status}`)
    return json({ error: 'provider_error', status: upstream.status }, 502)
  }

  let result: unknown
  try {
    result = await upstream.json()
  } catch {
    console.error('ai-proxy: upstream returned non-JSON')
    return json({ error: 'provider_error' }, 502)
  }

  // ---- 5. Record usage. --------------------------------------------------
  // BYOK only -- the managed path has no per-user config row to stamp. A
  // failure here must never turn an otherwise-successful AI response into
  // an error for the caller.
  if (keySource === 'byok' && admin) {
    try {
      await admin
        .from('ai_provider_configs')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('provider', provider)
    } catch {
      console.error('ai-proxy: last_used_at stamp failed')
    }
  }

  return json(result, 200)
})

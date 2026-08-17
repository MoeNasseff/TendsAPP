// Gemini transport -- the first concrete provider behind the Session 6
// interface. It declares what Gemini can do and how to call it; it holds no
// prompt and no receipt schema, because choosing those is Packet 6's job.
//
// Every call goes through the `ai-proxy` edge function, BYOK included. The
// browser never holds a provider key: `ai_provider_configs.api_key` is not
// selectable by the authenticated role, so there is nothing here to leak.
//
// API surface checked against ai.google.dev on 2026-08-16: it is
// POST /v1beta/interactions with a flat `input` array and `response_format`
// -- NOT models/{model}:generateContent with contents[].parts[] and
// generationConfig.responseSchema. This API has changed repeatedly; re-read
// the docs before editing rather than trusting this comment.
import { supabase } from '../supabase'
import type { AIProvider, AIResolution } from './types'

/** Flash tier: fast and free-tier eligible, and vision-capable. The model
 * is a parameter everywhere, so switching is a one-line change. */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.7-flash'

export const geminiProvider: AIProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  capabilities: ['vision', 'structuredOutput', 'text', 'reasoning'],
}

export type GeminiInputPart =
  | { type: 'text'; text: string }
  /** `data` is raw base64 with no data-URL prefix. */
  | { type: 'image'; data: string; mime_type: string }

export interface GeminiResponseFormat {
  type: 'text'
  mime_type: 'application/json'
  /** The documented JSON Schema subset: type/title/description, properties,
   * required, additionalProperties, enum, format, minimum/maximum, items,
   * prefixItems, minItems/maxItems. */
  schema: Record<string, unknown>
}

export interface GeminiRequest {
  input: GeminiInputPart[]
  model?: string
  responseFormat?: GeminiResponseFormat
}

/** The documented response shape. Every field is optional because this is
 * an external payload — Packet 6 narrows it by hand rather than trusting it. */
export interface GeminiInteraction {
  id?: string
  status?: string
  model?: string
  steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
}

export type GeminiFailure =
  /** No provider is configured. A correct outcome, not an error — manual
   * entry keeps working. */
  | 'unavailable'
  /** The user chose BYOK but has no usable key stored. */
  | 'byok_not_configured'
  /** Gemini itself refused or failed. Detail is deliberately not exposed. */
  | 'provider_error'
  /** The proxy could not be reached at all. */
  | 'transport_error'

export type GeminiResult =
  | { ok: true; interaction: GeminiInteraction }
  | { ok: false; reason: GeminiFailure }

/**
 * Runs one Gemini interaction for an already-resolved provider.
 *
 * `resolution` comes from `resolveProvider()` — this function never decides
 * for itself which key to use, and never falls back to a path the user has
 * not authorised. An `'unavailable'` resolution makes no network call at all.
 */
export async function runGemini(
  resolution: AIResolution,
  request: GeminiRequest,
): Promise<GeminiResult> {
  if (resolution.status === 'unavailable') return { ok: false, reason: 'unavailable' }

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      provider: geminiProvider.id,
      // 'byok' | 'managed' — the proxy loads the matching key server-side.
      key_source: resolution.status,
      model: request.model ?? GEMINI_DEFAULT_MODEL,
      input: request.input,
      ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
    },
  })

  if (error) return { ok: false, reason: await failureFrom(error) }

  return { ok: true, interaction: data as GeminiInteraction }
}

/** Maps a functions.invoke error onto our own vocabulary. The proxy's body
 * is the only thing read — never a raw message, which could carry detail we
 * do not want in the UI. */
async function failureFrom(error: unknown): Promise<GeminiFailure> {
  const context = (error as { context?: unknown }).context
  if (!(context instanceof Response)) return 'transport_error'

  try {
    const body = (await context.clone().json()) as { error?: unknown }
    if (body.error === 'unavailable' || body.error === 'byok_not_configured') return body.error
  } catch {
    // Non-JSON body — fall through to the generic reason.
  }
  return 'provider_error'
}

/**
 * The generated text, per the documented `steps[].content[].text` shape.
 * Returns null rather than throwing: Packet 6 validates by hand and needs to
 * tell "no text came back" apart from "text came back malformed".
 */
export function outputText(interaction: GeminiInteraction): string | null {
  const parts: string[] = []
  for (const step of interaction.steps ?? []) {
    for (const block of step.content ?? []) {
      if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    }
  }
  return parts.length > 0 ? parts.join('') : null
}

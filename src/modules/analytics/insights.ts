import { GEMINI_DEFAULT_MODEL, outputText, runGemini } from '../../lib/ai/gemini'
import type { AIResolution } from '../../lib/ai/types'

/**
 * The AI wording layer. Every call here sends one small, already-computed
 * metrics object — never a raw expense row, never the database. The model's
 * only job is to phrase numbers S15 already calculated; it never sees enough
 * to invent a number of its own.
 */

export interface InsightRequest {
  /** Card slot id — not shown to the model. */
  id: string
  /** What this insight is about, in plain language. */
  subject: string
  /** The only facts the model is allowed to state. */
  metrics: Record<string, unknown>
}

export interface Insight {
  id: string
  text: string
}

const SYSTEM_PROMPT = `You write one short line for a personal finance dashboard card.
Rules, all mandatory:
- Exactly one sentence, plain and factual.
- State the number(s) given in the data below; do not round away the point of the sentence.
- Never moralize, judge, or give advice — no "you should", no "you're overspending", no "consider".
- Never invent a comparison, store, product, or price that is not present in the data below.
- Never mention a percentage or amount that is not in the data below.
- Reply with the sentence only — no quotes, no markdown, no preamble.`

function promptFor(request: InsightRequest): string {
  return `${SYSTEM_PROMPT}\n\nWhat this insight is about: ${request.subject}\n\nData (the only facts you may state):\n${JSON.stringify(request.metrics)}`
}

/** Null on any failure — an insight that cannot be worded is simply absent,
 *  never a placeholder or an error string rendered as if it were content. */
export async function generateInsight(resolution: AIResolution, request: InsightRequest): Promise<Insight | null> {
  if (resolution.status === 'unavailable') return null

  const result = await runGemini(resolution, {
    input: [{ type: 'text', text: promptFor(request) }],
    model: GEMINI_DEFAULT_MODEL,
  })
  if (!result.ok) return null

  const text = outputText(result.interaction)
  if (!text) return null

  return { id: request.id, text: text.trim() }
}

export async function generateInsights(resolution: AIResolution, requests: InsightRequest[]): Promise<Insight[]> {
  if (resolution.status === 'unavailable' || requests.length === 0) return []
  const results = await Promise.all(requests.map((request) => generateInsight(resolution, request)))
  return results.filter((r): r is Insight => r !== null)
}

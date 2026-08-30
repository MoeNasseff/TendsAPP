// Registry of deterministic bank/payment-text parsers. Empty until Session 25
// lands real ones, built against tasks/sms-corpus.md -- see
// tasks/handoff-4.md. This file exists now (Session 27) purely as the
// integration seam: sms-ingest/index.ts calls runDeterministicParsers() once,
// unconditionally, and S25 only ever needs to push a module into PARSERS
// below. No orchestration logic changes when S25 lands.
//
// Each parser: match(text) => ParsedFields | null. Returning null means "not
// confident", never a partial guess -- a wrong number in a finance app is
// worse than a message that stays unparsed. A declined, OTP, promotional or
// balance-only message must return null from every parser.

export interface ParsedFields {
  direction: 'debit' | 'credit' | null
  amount: number | null
  currency: string | null
  merchantRaw: string | null
  last4: string | null
  occurredAt: string | null
  balance: number | null
}

type Parser = (text: string) => ParsedFields | null

const PARSERS: Parser[] = []

export function runDeterministicParsers(text: string): ParsedFields | null {
  for (const parser of PARSERS) {
    const result = parser(text)
    if (result) return result
  }
  return null
}

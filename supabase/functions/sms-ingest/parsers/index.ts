// Registry of deterministic bank/payment-text parsers, built against the real
// messages in tasks/sms-corpus.md (Session 25). A parser invented against an
// imagined format is worse than none: it half-matches a real message and writes
// a wrong number into a finance app.
//
// Each parser: match(text) => ParsedFields | null. Returning null means "not
// confident", never a partial guess -- a wrong number in a finance app is
// worse than a message that stays unparsed. A declined, OTP, promotional or
// balance-only message must return null from every parser.
//
// Order matters only for cost, not correctness: every pattern is anchored on
// phrasing unique to its sender, so no message matches two modules. CIB is
// first because it is the highest-volume sender in the corpus.
//
// ValU and Sympl are absent deliberately -- no real messages exist for either
// yet, and the rule above admits no exception for a format nobody has seen.
// Their instalment notices currently fall through to the AI path in S27.
//
// A note on `balance`, because it means two different things:
//   - CIB and FAB messages report *available credit* on a credit card.
//   - NBE messages report a real *account balance* on a debit card.
// The column cannot tell them apart, and summing the two would be meaningless.
// S32 introduces the account/card model that gives each its own home; until
// then, read `balance` together with the card it came from, never on its own.

import { match as cib } from './cib.ts'
import { match as fab } from './fab.ts'
import { match as nbe } from './nbe.ts'
import type { ParsedFields } from './shared.ts'

export type { ParsedFields } from './shared.ts'
export { isSalaryCredit } from './cib.ts'

type Parser = (text: string) => ParsedFields | null

const PARSERS: Parser[] = [cib, fab, nbe]

export function runDeterministicParsers(text: string): ParsedFields | null {
  for (const parser of PARSERS) {
    const result = parser(text)
    // An amount is the one field with no safe default. A "match" without one is
    // a pattern that fired on the wrong message, so it is discarded rather than
    // written as a transaction with a null amount.
    if (result && result.amount !== null) return result
  }
  return null
}

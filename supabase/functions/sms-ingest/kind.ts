// Transaction kind: deciding what an SMS actually *describes*, as opposed to
// which way the money moved.
//
// `direction` (S25) answers "in or out". It cannot answer "is this spending",
// because the account debit that pays off a credit card is `debit` in exactly
// the same way a purchase is. Counting it would double-count every card
// purchase ever made -- see tasks/s35-transaction-kind.md for the three-message
// walkthrough.
//
// Nothing here writes to `expenses`. This module only ever fills
// `sms_inbox.suggested_kind` and `sms_inbox.paired_inbox_id`; a human still
// accepts the row on /inbox. "Auto-mark" in the plan means auto-*classify*,
// not auto-record.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { MessageShape } from './parsers/shared.ts'

export type TransactionKind = 'purchase' | 'transfer' | 'card_payment' | 'refund' | 'withdrawal'

/**
 * What each recognised message shape means, financially.
 *
 * `null` is not "unknown" -- it means the shape is a credit and so is never an
 * expense at all, which the direction guard in `useInbox` already enforces.
 * Leaving `suggested_kind` null on those rows keeps the column honest: it says
 * "no kind applies", not "we could not tell".
 *
 * A `Record` over the closed `MessageShape` union rather than a switch with a
 * default, so adding a shape to a parser fails the type-check here until it is
 * classified. A new bank message shape must never inherit "purchase" by
 * omission.
 */
const SHAPE_KIND: Record<MessageShape, TransactionKind | null> = {
  // Real spending: a merchant was paid.
  card_charge: 'purchase',
  debit_card_purchase: 'purchase',

  // Settles a card balance. Credit, so it can never reach `expenses` anyway --
  // classified explicitly so the pairing pass can find it by kind.
  card_payment: 'card_payment',

  // Money genuinely leaving an account, but the text never names the
  // destination: "with transfer to another account" reads identically whether
  // it paid your own card or sent money to a person. Defaulted to `transfer`
  // because under-counting spending is recoverable and over-counting is not --
  // a missed expense is one the user adds back, a phantom one silently inflates
  // every number until somebody audits it.
  account_debit: 'transfer',
  ipn_debit: 'transfer',
  instant_transfer_out: 'transfer',

  // Credits. Money arriving is not an expense of any kind.
  instant_transfer_in: null,
  salary_credit: null,
}

export function kindForShape(shape: MessageShape): TransactionKind | null {
  return SHAPE_KIND[shape]
}

/** The outbound shapes whose `transfer` default is a guess worth confirming. */
const PAIRABLE_DEBIT_SHAPES: MessageShape[] = ['account_debit', 'ipn_debit', 'instant_transfer_out']

/** How far apart the two halves of one settlement may land. */
const PAIR_WINDOW_DAYS = 3

/**
 * Amounts are `numeric` in Postgres but arrive here as JS numbers, so an
 * equality test would be at the mercy of float representation. A one-cent
 * window is exact for every real currency amount and still far tighter than
 * any coincidence the ±3-day window could admit.
 */
const AMOUNT_EPSILON = 0.01

/** The minimum a row must expose to be considered for pairing. */
export interface PairableRow {
  id: string
  parsed_amount: number | null
  parsed_occurred_at: string | null
  received_at: string
}

/**
 * `parsed_occurred_at` is when the bank says it happened; `received_at` is
 * when the phone forwarded it. The first is right whenever it exists — a text
 * delivered late must not drift outside the window for that reason alone.
 */
function effectiveTime(row: { parsed_occurred_at: string | null; received_at: string }): number {
  return new Date(row.parsed_occurred_at ?? row.received_at).getTime()
}

/**
 * The matching rule itself, as a pure function over already-fetched rows.
 *
 * Extracted so the ingest-time path and the one-off backfill of rows that
 * predate this code (`scripts/backfill-transaction-kind.ts`) apply exactly the
 * same rule. Two implementations of "same amount within ±3 days" would
 * eventually disagree, and the disagreement would show up as a number nobody
 * could account for.
 *
 * Nearest in time wins. With several settlements of the same amount inside one
 * window the closest is the only defensible choice — and picking one
 * deterministically beats leaving all of them unpaired.
 */
export function selectPair<T extends PairableRow>(
  candidates: T[],
  mine: { id: string; amount: number; occurredAt: string | null; receivedAt: string },
): T | null {
  const mineAt = effectiveTime({ parsed_occurred_at: mine.occurredAt, received_at: mine.receivedAt })
  const windowMs = PAIR_WINDOW_DAYS * 24 * 60 * 60 * 1000

  const best = candidates
    .filter((c) => c.id !== mine.id && c.parsed_amount !== null)
    .filter((c) => Math.abs(Number(c.parsed_amount) - mine.amount) <= AMOUNT_EPSILON)
    .map((c) => ({ c, gap: Math.abs(effectiveTime(c) - mineAt) }))
    .filter(({ gap }) => gap <= windowMs)
    .sort((a, b) => a.gap - b.gap)[0]

  return best ? best.c : null
}

/**
 * Links an account debit to the card-payment settlement it funds, in whichever
 * order the two messages happen to arrive.
 *
 * The corpus shows the pair landing 1-2 days apart (1,155.00 card-dated 28-08
 * and account-dated 30 AUG; 43,761.00 card-dated 30-08 and account-dated
 * 31 AUG) and the arrival order is not guaranteed -- the phone delivers
 * whichever automation fires first. Matching only in one direction would
 * silently fail every time the debit arrived first, so this runs both ways and
 * writes the link onto **both** rows.
 *
 * Review status is deliberately not filtered. A user who dismisses the
 * card-payment credit (the current UI's action for any credit) has said
 * nothing about whether the settlement happened -- it did, the bank sent the
 * text. Pairing describes what arrived, not what was done with it.
 *
 * Best-effort throughout: a failure here leaves both rows unpaired and
 * reviewable by hand, which is the same state they were in before.
 */
export async function pairSettlement(
  admin: SupabaseClient,
  userId: string,
  row: {
    id: string
    shape: MessageShape
    amount: number | null
    occurredAt: string | null
    receivedAt: string
  },
): Promise<string | null> {
  if (row.amount === null) return null

  const isDebitSide = PAIRABLE_DEBIT_SHAPES.includes(row.shape)
  const isCardPaymentSide = row.shape === 'card_payment'
  if (!isDebitSide && !isCardPaymentSide) return null

  // Look for the opposite half: a debit hunts for the card_payment credit, and
  // the credit hunts for any of the three outbound debit shapes.
  const wantedKind = isDebitSide ? 'card_payment' : 'transfer'

  const { data: candidates } = await admin
    .from('sms_inbox')
    .select('id, parsed_amount, parsed_occurred_at, received_at, suggested_kind')
    .eq('user_id', userId)
    .eq('suggested_kind', wantedKind)
    .is('paired_inbox_id', null)
    .neq('id', row.id)
    .gte('parsed_amount', row.amount - AMOUNT_EPSILON)
    .lte('parsed_amount', row.amount + AMOUNT_EPSILON)

  if (!candidates || candidates.length === 0) return null

  // The amount filter in the query above is an index optimisation, not the
  // rule -- selectPair applies it again so the rule lives in exactly one place.
  const match = selectPair(candidates as PairableRow[], {
    id: row.id,
    amount: row.amount,
    occurredAt: row.occurredAt,
    receivedAt: row.receivedAt,
  })

  if (!match) return null

  // Both directions, so either row can explain itself in the review UI without
  // a second lookup.
  await admin.from('sms_inbox').update({ paired_inbox_id: row.id }).eq('id', match.id)

  return match.id
}

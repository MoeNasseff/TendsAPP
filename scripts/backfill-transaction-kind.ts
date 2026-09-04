/**
 * One-off backfill for s35 Part 2 (`20260903120000_transaction_kind.sql`).
 *
 * Rows ingested before that migration have `suggested_kind` and
 * `paired_inbox_id` null: the shape-naming parsers and the pairing pass did
 * not exist when they arrived, and both run only at ingest. Without this, the
 * card-settlement pair already sitting in the inbox never classifies itself
 * and the account debit still offers "Accept" as though it were spending.
 *
 * Design, and why it is shaped this way:
 *
 * - **It runs the real parsers.** Deriving message shape from `raw_text` in
 *   SQL would mean a second copy of every regex in a language that cannot be
 *   unit-tested against the corpus. Same precedent as the 2026-09-02 backfill,
 *   which ran the real parser locally and wrote the results back.
 * - **It uses `selectPair` from kind.ts**, not its own matching. One rule for
 *   "same amount within +/-3 days", used by both the ingest path and this.
 * - **Rows arrive on stdin and only SQL leaves on stdout.** Bank message text
 *   is never written to a file and never printed; the emitted statements carry
 *   row ids and classifications, nothing else. The summary goes to stderr as
 *   counts.
 * - **Idempotent.** Only rows still null are touched, so a second run is a
 *   no-op and a partial run can simply be repeated.
 *
 * Usage — the casts matter, see asUuid below:
 *
 *   SELECT="select id::text, raw_text, parsed_direction, parsed_amount::float8,
 *           parsed_occurred_at::text, received_at::text, suggested_kind,
 *           paired_inbox_id::text from public.sms_inbox order by received_at;"
 *   supabase db query --db-url "$URL" "$SELECT" | npx tsx scripts/backfill-transaction-kind.ts
 *
 * It writes nothing itself. Review the SQL, then apply it deliberately.
 */
import { kindForShape, selectPair, type PairableRow } from '../supabase/functions/sms-ingest/kind.ts'
import { runDeterministicParsers } from '../supabase/functions/sms-ingest/parsers/index.ts'

interface InboxRow extends PairableRow {
  raw_text: string | null
  parsed_direction: string | null
  suggested_kind: string | null
  paired_inbox_id: string | null
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (buf += chunk))
    process.stdin.on('end', () => resolve(buf))
    process.stdin.on('error', reject)
  })
}

/**
 * `supabase db query` wraps results in `{ boundary, rows, warning }`. A bare
 * array is accepted too, so the script also works against a plain psql
 * `json_agg` dump without a second code path.
 */
function parseRows(raw: string): InboxRow[] {
  const start = raw.indexOf('{') >= 0 && (raw.indexOf('[') < 0 || raw.indexOf('{') < raw.indexOf('['))
    ? raw.indexOf('{')
    : raw.indexOf('[')
  if (start < 0) throw new Error('no JSON found on stdin')

  const parsed = JSON.parse(raw.slice(start, raw.lastIndexOf(raw[start] === '{' ? '}' : ']') + 1))
  const rows = Array.isArray(parsed) ? parsed : parsed.rows
  if (!Array.isArray(rows)) throw new Error('expected an array of rows, or an object with a `rows` array')
  return rows as InboxRow[]
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * `supabase db query` serialises a `uuid` as a 16-byte array, not a string —
 * so the documented SELECT casts `id::text`. Normalised here as well so the
 * script cannot silently mis-handle a run whose query forgot the cast: the
 * failure mode without this is a `TypeError` at best and a malformed id in a
 * generated UPDATE at worst.
 */
function asUuid(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length === 16) {
    const hex = value.map((b) => Number(b).toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  throw new Error('unrecognised uuid encoding — select id::text')
}

/** `numeric` can arrive as a number or a string depending on the driver. */
function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const rows = parseRows(await readStdin()).map((r) => ({
  ...r,
  id: asUuid(r.id),
  parsed_amount: asNumber(r.parsed_amount),
  paired_inbox_id: r.paired_inbox_id === null ? null : asUuid(r.paired_inbox_id),
}))

// ---- Phase 1: name the kind, from the shape the real parser reports. -------

const resolvedKind = new Map<string, string>()
let unreadable = 0
let alreadyClassified = 0

for (const row of rows) {
  if (row.suggested_kind !== null) {
    alreadyClassified++
    // Still needed below: an already-classified row is a valid pair candidate.
    resolvedKind.set(row.id, row.suggested_kind)
    continue
  }
  if (!row.raw_text) {
    unreadable++
    continue
  }

  const parsed = runDeterministicParsers(row.raw_text)
  if (!parsed) {
    // An AI-parsed or never-parsed row. Left null deliberately — that is the
    // column saying "no parser was confident", which is not the same claim as
    // "this is a purchase". These ask the user.
    unreadable++
    continue
  }

  const kind = kindForShape(parsed.shape)
  // A credit shape (salary, transfer in) maps to null: it is never an expense
  // of any kind, and the direction guard already blocks it.
  if (kind) resolvedKind.set(row.id, kind)
}

const statements: string[] = []
for (const row of rows) {
  const kind = resolvedKind.get(row.id)
  if (!kind || row.suggested_kind !== null) continue
  statements.push(
    `update public.sms_inbox set suggested_kind = ${sqlLiteral(kind)} where id = ${sqlLiteral(row.id)} and suggested_kind is null;`,
  )
}
const classified = statements.length

// ---- Phase 2: pair each transfer with the settlement it funds. ------------

const unpairedCardPayments = rows.filter(
  (r) => resolvedKind.get(r.id) === 'card_payment' && r.paired_inbox_id === null,
)
const claimed = new Set<string>()
let paired = 0

for (const row of rows) {
  if (resolvedKind.get(row.id) !== 'transfer' || row.paired_inbox_id !== null) continue
  if (row.parsed_amount === null) continue

  const match = selectPair(
    unpairedCardPayments.filter((c) => !claimed.has(c.id)),
    {
      id: row.id,
      amount: Number(row.parsed_amount),
      occurredAt: row.parsed_occurred_at,
      receivedAt: row.received_at,
    },
  )
  if (!match) continue

  // One settlement funds one debit. Without this a single card payment could
  // be claimed by several same-amount debits in the same window.
  claimed.add(match.id)
  paired++

  // Both directions, matching what pairSettlement writes at ingest.
  statements.push(
    `update public.sms_inbox set paired_inbox_id = ${sqlLiteral(match.id)} where id = ${sqlLiteral(row.id)} and paired_inbox_id is null;`,
  )
  statements.push(
    `update public.sms_inbox set paired_inbox_id = ${sqlLiteral(row.id)} where id = ${sqlLiteral(match.id)} and paired_inbox_id is null;`,
  )
}

// Counts only — never message text, amounts or senders.
console.error(
  [
    `rows read:              ${rows.length}`,
    `already classified:     ${alreadyClassified}`,
    `newly classified:       ${classified}`,
    `left null (no parser):  ${unreadable}`,
    `settlement pairs found: ${paired}`,
    `statements emitted:     ${statements.length}`,
  ].join('\n'),
)

if (statements.length === 0) {
  console.error('\nNothing to do.')
} else {
  // Emitted as ONE `do` block rather than a `begin; … commit;` script, for two
  // reasons. `supabase db query` sends its argument as a prepared statement,
  // which rejects multiple commands outright (SQLSTATE 42601) — so a plain
  // script cannot be applied through the tool this project actually uses. And
  // a `do` block is a single statement, so it is atomic by construction: a
  // partial apply cannot leave one half of a pair pointing at a row whose own
  // link never landed.
  console.log('do $backfill$')
  console.log('begin')
  for (const s of statements) console.log(`  ${s}`)
  console.log('end')
  console.log('$backfill$;')
}

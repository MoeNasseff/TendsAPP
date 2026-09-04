import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Inbox as InboxIcon } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { PrivacyToggle } from '../../components/PrivacyToggle'
import { SensitiveValue } from '../../components/SensitiveValue'
import { ExpenseForm, type ExpenseDraft } from '../expenses/ExpenseForm'
import { useExpenses } from '../expenses/useExpenses'
import type { ExpenseInput } from '../expenses/useExpenses'
import { isKindDecided, suggestedKind, useInbox } from './useInbox'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format'
import type { InboxMessage, TransactionKind } from '../../lib/types'

const CARD_TITLE = 'mb-1 text-lg font-semibold text-gray-800 dark:text-white/90'
const CARD_SUB = 'block text-gray-500 text-theme-sm dark:text-gray-400'

function StatusBadge({ message }: { message: InboxMessage }) {
  switch (message.status) {
    case 'unparsed':
      return (
        <Badge color="warning" size="sm">
          Not parsed
        </Badge>
      )
    case 'pending':
      return (
        <Badge color="light" size="sm">
          {message.parse_method === 'ai' ? 'AI-parsed — needs review' : 'Parsed — needs review'}
        </Badge>
      )
    case 'accepted':
      return (
        <Badge color="success" size="sm">
          Accepted
        </Badge>
      )
    case 'rejected':
      return (
        <Badge color="error" size="sm">
          Rejected
        </Badge>
      )
    case 'ignored':
      return (
        <Badge color="light" size="sm">
          Ignored
        </Badge>
      )
  }
}

function DirectionBadge({ direction }: { direction: InboxMessage['parsed_direction'] }) {
  if (!direction) return null
  return direction === 'credit' ? (
    <Badge color="success" size="sm">
      Money in
    </Badge>
  ) : (
    <Badge color="light" size="sm">
      Money out
    </Badge>
  )
}

/**
 * Shown only when a row is *not* an ordinary purchase. Labelling every normal
 * card charge "Purchase" would be noise on the majority of rows and would make
 * the exceptional ones harder to spot, which is the opposite of the point.
 */
function KindBadge({ message }: { message: InboxMessage }) {
  switch (message.suggested_kind) {
    case 'transfer':
      return (
        <Badge color="warning" size="sm">
          Transfer
        </Badge>
      )
    case 'card_payment':
      return (
        <Badge color="light" size="sm">
          Card payment
        </Badge>
      )
    default:
      return null
  }
}

/**
 * The pairing explanation: why this row is being treated as a transfer rather
 * than as spending. Without it the classification is a number changing for an
 * invisible reason, which in a finance app is indistinguishable from a bug.
 *
 * Both halves of a pair carry the link, so this renders on both and has to
 * read correctly from either side — the account debit points *forward* to the
 * card payment it settles, the card payment points *back* to the debit that
 * funds it. Describing both as "matched to a card payment" would label the
 * account's own last4 as a card number.
 */
function PairingNote({ message, paired }: { message: InboxMessage; paired: InboxMessage }) {
  const when = formatDate(paired.parsed_occurred_at ?? paired.received_at)
  const amount =
    paired.parsed_amount !== null
      ? formatCurrency(paired.parsed_amount, paired.parsed_currency ?? 'EGP')
      : null
  const where = paired.parsed_last4 ? ` …${paired.parsed_last4}` : ''

  return (
    <p className="rounded-lg bg-warning-50 px-3 py-2 text-theme-xs text-warning-600 dark:bg-warning-500/15 dark:text-orange-400">
      {message.suggested_kind === 'card_payment' ? (
        <>
          Matched to the account debit that funds it — {amount ?? 'same amount'} from
          {where || ' your account'} on {when}. Both describe one movement of money.
        </>
      ) : (
        <>
          Matched to the card payment it settles — {amount ?? 'same amount'} on card
          {where || ' on file'} on {when}. Recorded, but kept out of spending totals: the
          purchases it pays for are already counted one by one.
        </>
      )}
    </p>
  )
}

/**
 * The one decision the parser cannot make for you.
 *
 * Three cases, and the difference between them is the whole design:
 *
 * - **Paired.** The row matched a card-payment settlement, which is a match
 *   against a message shape that means one specific thing, not a bare
 *   amount-and-window coincidence. Stated, not asked.
 * - **Unpaired transfer.** "Transfer to another account" reads identically
 *   whether it paid your own card or sent money to a person. Genuinely a
 *   guess, so it asks — pre-selected as a transfer, because under-counting
 *   spending is recoverable and over-counting is not.
 * - **Anything else.** An ordinary purchase. No question, no control.
 */
function KindChoice({
  message,
  value,
  onChange,
}: {
  message: InboxMessage
  value: TransactionKind
  onChange: (kind: TransactionKind) => void
}) {
  if (isKindDecided(message)) {
    return (
      <p className="mb-5 rounded-lg bg-warning-50 px-3 py-2 text-theme-xs text-warning-600 dark:bg-warning-500/15 dark:text-orange-400">
        Recorded as a <strong>transfer</strong> — it settles a card balance, so it stays out of
        spending totals. The purchases it pays for are already counted individually.
      </p>
    )
  }

  if (message.suggested_kind !== 'transfer') return null

  return (
    <fieldset className="mb-5">
      <legend className="mb-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
        Is this spending?
      </legend>
      <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
        The text says only “transfer to another account” and never names the destination, so this
        cannot be read from the message alone.
      </p>
      <div className="flex flex-col gap-2">
        {(
          [
            ['transfer', 'No — moving my own money', 'Recorded, but kept out of spending totals.'],
            ['purchase', 'Yes — this was spending', 'Counted in totals, budgets and charts.'],
          ] as const
        ).map(([kind, label, hint]) => (
          <label
            key={kind}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 has-checked:border-brand-500 has-checked:bg-brand-50 dark:border-white/10 dark:hover:bg-white/5 dark:has-checked:bg-brand-500/10"
          >
            <input
              type="radio"
              name="transaction-kind"
              value={kind}
              checked={value === kind}
              onChange={() => onChange(kind)}
              className="mt-0.5 accent-brand-500"
            />
            <span className="min-w-0">
              <span className="block text-theme-sm text-gray-800 dark:text-white/90">{label}</span>
              <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function PendingRow({
  message,
  paired,
  expanded,
  onToggle,
  onAccept,
  onReject,
}: {
  message: InboxMessage
  paired: InboxMessage | null
  expanded: boolean
  onToggle: () => void
  onAccept: () => void
  onReject: () => void
}) {
  const isCredit = message.parsed_direction === 'credit'
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
              {message.sender_label ?? 'Unknown sender'}
            </p>
            <StatusBadge message={message} />
            <DirectionBadge direction={message.parsed_direction} />
            <KindBadge message={message} />
          </div>
          <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
            {formatDateTime(message.received_at)}
            {message.parsed_merchant_raw ? ` · ${message.parsed_merchant_raw}` : ''}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {message.parsed_amount === null ? (
              <span className="text-gray-400 dark:text-gray-500">Not parsed</span>
            ) : (
              <SensitiveValue>{formatCurrency(message.parsed_amount, message.parsed_currency ?? 'EGP')}</SensitiveValue>
            )}
          </span>
          {!isCredit && (
            <button
              type="button"
              onClick={onAccept}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Accept
            </button>
          )}
          <button
            type="button"
            onClick={onReject}
            className="rounded-lg px-2 py-1.5 text-theme-xs text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
          >
            {isCredit ? 'Dismiss' : 'Reject'}
          </button>
        </div>
      </div>

      {paired && <PairingNote message={message} paired={paired} />}

      {/* The parse is only trustworthy if it can be checked against the
          source in the same place — never just the extracted numbers. */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-fit items-center gap-1 text-theme-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? 'Hide message' : 'Show message'}
      </button>
      {expanded && (
        <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
          {message.raw_text ?? '(no text stored)'}
        </p>
      )}
    </div>
  )
}

function ResolvedRow({ message }: { message: InboxMessage }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-theme-sm text-gray-600 dark:text-gray-300">
          {message.sender_label ?? 'Unknown sender'}
        </p>
        <span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">
          {formatDateTime(message.received_at)}
        </span>
      </div>
      <StatusBadge message={message} />
    </div>
  )
}

export function InboxPage() {
  const { loading, available, messages, pending, resolved, acceptMessage, rejectMessage } = useInbox()
  const { categories, addCategory } = useExpenses()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [accepting, setAccepting] = useState<InboxMessage | null>(null)
  const [acceptKind, setAcceptKind] = useState<TransactionKind>('purchase')
  const [rejecting, setRejecting] = useState<InboxMessage | null>(null)

  // Settlement pairing is stored as an id on both halves, so the counterpart
  // is already in `messages` — no extra fetch to explain a row.
  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages])

  // Captured once when Accept is clicked, not re-derived from `pending` on
  // every render — `useInbox` reloads over realtime, and a live-bound
  // `initial` object would reset the form mid-edit every time another
  // message arrived.
  const draft = useMemo<ExpenseDraft | undefined>(() => {
    if (!accepting) return undefined
    return {
      amount: accepting.parsed_amount,
      category_id: accepting.suggested_category_id,
      note: accepting.parsed_merchant_raw ? `From ${accepting.sender_label ?? 'bank text'}: ${accepting.parsed_merchant_raw}` : null,
      spent_at: accepting.parsed_occurred_at ? accepting.parsed_occurred_at.slice(0, 10) : null,
    }
  }, [accepting])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return <PageSkeleton />

  if (!available) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="BANK SMS" title="Inbox" />
        <Card>
          <h3 className={CARD_TITLE}>Not set up yet</h3>
          <span className={CARD_SUB}>The SMS inbox migration has not been applied to this project.</span>
          <p className="mt-4 rounded-lg bg-gray-50 p-3 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
            supabase/migrations/20260830000000_sms_inbox.sql
          </p>
        </Card>
      </div>
    )
  }

  async function handleAcceptSubmit(input: ExpenseInput) {
    if (!accepting) return
    const { error } = await acceptMessage(accepting, { ...input, kind: acceptKind })
    if (error) throw error
    setAccepting(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="BANK SMS" title="Inbox" titleAdornment={<PrivacyToggle />} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <Card>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">Awaiting review</p>
          <h4 className="mt-3 text-2xl font-bold text-gray-800 dark:text-white/90">{pending.length}</h4>
        </Card>
        <Card>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">Not parsed</p>
          <h4 className="mt-3 text-2xl font-bold text-gray-800 dark:text-white/90">
            {pending.filter((m) => m.status === 'unparsed').length}
          </h4>
        </Card>
      </div>

      <Card>
        <div className="mb-5">
          <h3 className={CARD_TITLE}>Awaiting review</h3>
          <span className={CARD_SUB}>Newest first. Nothing here becomes an expense until you accept it.</span>
        </div>

        {pending.length > 0 ? (
          <div className="flex flex-col gap-4">
            {pending.map((message) => (
              <PendingRow
                key={message.id}
                message={message}
                paired={message.paired_inbox_id ? (messageById.get(message.paired_inbox_id) ?? null) : null}
                expanded={expandedIds.has(message.id)}
                onToggle={() => toggleExpanded(message.id)}
                onAccept={() => {
                  setAcceptKind(suggestedKind(message))
                  setAccepting(message)
                }}
                onReject={() => setRejecting(message)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={InboxIcon}
            title="Nothing waiting"
            description="Bank and payment texts land here once the Shortcut is set up — see docs/ios-sms-shortcut.md."
          />
        )}
      </Card>

      {resolved.length > 0 && (
        <Card>
          <div className="mb-5">
            <h3 className={CARD_TITLE}>Recent history</h3>
            <span className={CARD_SUB}>Accepted and rejected texts</span>
          </div>
          <div className="flex flex-col gap-3">
            {resolved.slice(0, 10).map((message) => (
              <ResolvedRow key={message.id} message={message} />
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!accepting} onClose={() => setAccepting(null)} title="Accept as expense">
        {accepting && <KindChoice message={accepting} value={acceptKind} onChange={setAcceptKind} />}
        <ExpenseForm
          categories={categories}
          editing={null}
          initial={draft}
          onSubmit={handleAcceptSubmit}
          onCancelEdit={() => setAccepting(null)}
          onAddCategory={addCategory}
        />
      </Modal>

      <ConfirmDialog
        open={!!rejecting}
        title={rejecting?.parsed_direction === 'credit' ? 'Dismiss this message?' : 'Reject this message?'}
        message={
          rejecting?.parsed_direction === 'credit'
            ? 'It stays in your history — this is money coming in, not spending, so nothing is created from it.'
            : 'It stays in your history marked rejected, and nothing is created from it.'
        }
        confirmLabel={rejecting?.parsed_direction === 'credit' ? 'Dismiss' : 'Reject'}
        onCancel={() => setRejecting(null)}
        onConfirm={async () => {
          if (rejecting) await rejectMessage(rejecting.id)
          setRejecting(null)
        }}
      />
    </div>
  )
}

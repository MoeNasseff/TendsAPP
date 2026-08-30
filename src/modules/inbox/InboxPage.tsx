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
import { useInbox } from './useInbox'
import { formatCurrency, formatDateTime } from '../../lib/format'
import type { InboxMessage } from '../../lib/types'

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
          Parsed — needs review
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

function PendingRow({
  message,
  expanded,
  onToggle,
  onAccept,
  onReject,
}: {
  message: InboxMessage
  expanded: boolean
  onToggle: () => void
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
              {message.sender_label ?? 'Unknown sender'}
            </p>
            <StatusBadge message={message} />
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
          <button
            type="button"
            onClick={onAccept}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded-lg px-2 py-1.5 text-theme-xs text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
          >
            Reject
          </button>
        </div>
      </div>

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
  const { loading, available, pending, resolved, acceptMessage, rejectMessage } = useInbox()
  const { categories, addCategory } = useExpenses()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [accepting, setAccepting] = useState<InboxMessage | null>(null)
  const [rejecting, setRejecting] = useState<InboxMessage | null>(null)

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
        <PageHeader eyebrow="BANK TEXTS" title="Inbox" />
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
    const { error } = await acceptMessage(accepting, input)
    if (error) throw error
    setAccepting(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="BANK TEXTS" title="Inbox" titleAdornment={<PrivacyToggle />} />

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
                expanded={expandedIds.has(message.id)}
                onToggle={() => toggleExpanded(message.id)}
                onAccept={() => setAccepting(message)}
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
        title="Reject this message?"
        message="It stays in your history marked rejected, and nothing is created from it."
        confirmLabel="Reject"
        onCancel={() => setRejecting(null)}
        onConfirm={async () => {
          if (rejecting) await rejectMessage(rejecting.id)
          setRejecting(null)
        }}
      />
    </div>
  )
}

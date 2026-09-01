import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, Plus } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { SensitiveValue } from '../../components/SensitiveValue'
import { formatCurrency } from '../../lib/format'
import { logoPath, monogram, NEUTRAL_BRAND, providerFor } from '../installments/providers'
import { PaymentMethodForm } from '../installments/PaymentMethodForm'
import { useAccounts, type MethodBalance, type UtilisationState } from './useAccounts'

const CARD = 'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6'
const CARD_TITLE = 'mb-1 text-lg font-semibold text-gray-800 dark:text-white/90'
const CARD_SUB = 'block text-gray-500 text-theme-sm dark:text-gray-400'
const FILTER_BTN = 'rounded-lg border px-3 py-1.5 text-theme-xs font-medium transition-colors'
const FILTER_ON = 'border-brand-500 bg-brand-500/10 text-brand-500'
const FILTER_OFF = 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'

function utilisationTone(pct: number): string {
  if (pct >= 70) return 'bg-error-500'
  if (pct >= 30) return 'bg-warning-500'
  return 'bg-success-500'
}

/**
 * Ported from the TailAdmin finance demo's "My Cards" element
 * (react-demo.tailadmin.com/finance). The dark card shell, rounded-[14px]
 * corners and Active/Inactive treatment are kept; several fields are swapped
 * for what this app actually tracks rather than the source's demo data —
 * each is a hard constraint of this schema, not a style choice:
 *
 *  - No CVC field. This schema has no CVV column anywhere by design — see
 *    20260826120000_installments.sql: "a personal finance app that
 *    warehouses PANs is a liability, not a feature." Never fabricate one.
 *  - No EXP field — payment_methods has no expiry date. Replaced with the
 *    balance or available credit this app actually observes.
 *  - Cardholder name -> payment_methods.label. One user; "whose name is on
 *    the card" isn't a fact worth a field, and label already carries what
 *    the card/account means (e.g. "CIB Current Account").
 *  - No card-vector.png decoration — not a vendored asset, purely cosmetic.
 *    A radial gradient in the provider's own brand colour instead.
 *  - Active/Inactive uses this project's own Badge component rather than the
 *    source's bespoke translucent pill, matching how every other status
 *    chip in the app is built (see InboxPage's StatusBadge).
 */
function CardFace({ method, latest }: MethodBalance) {
  const provider = providerFor(method.provider_slug)
  const src = logoPath(provider)
  const isCredit = method.kind === 'credit_card'
  const figure = isCredit ? (latest?.available_credit ?? null) : (latest?.balance ?? null)

  return (
    <div className="relative flex w-full shrink-0 flex-col gap-7 overflow-hidden rounded-[14px] border border-gray-800 bg-gray-900 p-6 dark:bg-gray-950">
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${provider?.brand ?? NEUTRAL_BRAND}, transparent 70%)` }}
        aria-hidden="true"
      />
      <div className="flex justify-between">
        <div className="flex items-center gap-4">
          {/* Generic contactless-payment glyph, not a brand mark — kept verbatim from the source. */}
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M6.27887 16.1701C10.2976 12.1513 10.2976 5.63571 6.27887 1.61701L7.89586 0C12.8075 4.91175 12.8075 12.8753 7.89586 17.7871L6.27887 16.1701ZM3.04479 12.9359C5.27749 10.7033 5.27749 7.08352 3.04479 4.85088L4.66177 3.23388C7.78747 6.35954 7.78747 11.4273 4.66177 14.5528L3.04479 12.9359Z"
              fill="white"
            />
            <path
              d="M0 7.49219C0.681044 8.04224 0.788117 9.70961 0 10.3699L1.57669 11.5741C3.05722 10.0936 3.05722 7.69324 1.57669 6.21274L0 7.49219Z"
              fill="white"
            />
          </svg>
          <Badge color={method.active ? 'success' : 'light'} size="sm">
            {method.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {src ? (
          <img src={src} alt="" className="h-6 max-w-[72px] object-contain" />
        ) : (
          <span className="text-xs font-semibold text-white/70">{provider?.label ?? monogram(method.label)}</span>
        )}
      </div>

      <h3 className="text-base font-normal text-white">{method.label}</h3>

      <div className="flex justify-between gap-5 sm:gap-10">
        <div className="flex-1">
          <p className="text-sm text-white/80">{method.kind === 'bank_transfer' ? 'Account number' : 'Card number'}</p>
          <p className="text-base font-normal text-white">
            {method.last4 ? `•••• •••• •••• ${method.last4}` : 'Not recorded'}
          </p>
        </div>
        <div>
          <p className="text-sm text-white/80">{isCredit ? 'Available credit' : 'Balance'}</p>
          <p className="text-base font-normal text-white">
            {figure === null ? '—' : <SensitiveValue>{formatCurrency(figure, method.currency)}</SensitiveValue>}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Swiper.js -> a small motion/react-driven slide. Swiper isn't a project
 * dependency and installing one for what's usually 2-6 cards is
 * disproportionate; motion is already used the same way for BottomNav's
 * active-tab indicator (Session 31).
 */
function CardCarousel({ methodBalances, onAddCard }: { methodBalances: MethodBalance[]; onAddCard: () => void }) {
  const [index, setIndex] = useState(0)
  const reduceMotion = useReducedMotion()
  const clamped = Math.min(index, Math.max(0, methodBalances.length - 1))

  return (
    <div className={CARD}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className={CARD_TITLE}>My Cards</h3>
        <button
          type="button"
          onClick={onAddCard}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          <Plus className="h-4 w-4" />
          Add Card
        </button>
      </div>

      {methodBalances.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <CreditCard className="h-5 w-5 text-gray-400 dark:text-gray-600" aria-hidden="true" />
          <p className="font-medium text-gray-700 text-theme-sm dark:text-gray-200">No cards or accounts yet</p>
          <p className="max-w-xs text-gray-500 text-theme-xs dark:text-gray-400">
            Add a bank account or card to see its balance here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden">
            <motion.div
              className="flex"
              animate={{ x: `-${clamped * 100}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}
            >
              {methodBalances.map((mb) => (
                <div key={mb.method.id} className="w-full shrink-0">
                  <CardFace {...mb} />
                </div>
              ))}
            </motion.div>
          </div>
          {methodBalances.length > 1 && (
            <div className="mt-4 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={clamped === 0}
                aria-label="Previous card"
                className="flex h-8 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(methodBalances.length - 1, i + 1))}
                disabled={clamped === methodBalances.length - 1}
                aria-label="Next card"
                className="flex h-8 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function UtilisationRow({ method, utilisation }: MethodBalance & { utilisation: UtilisationState }) {
  const provider = providerFor(method.provider_slug)
  const src = logoPath(provider)

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg font-semibold text-white"
          style={{ background: src ? undefined : (provider?.brand ?? NEUTRAL_BRAND) }}
        >
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : monogram(method.label)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">{method.label}</p>
          <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
            {method.last4 ? `•••• ${method.last4}` : '—'}
          </span>
        </div>
      </div>

      {utilisation.status === 'not_recorded' && (
        <span className="shrink-0 text-theme-xs text-gray-400 dark:text-gray-500">Limit not recorded</span>
      )}
      {utilisation.status === 'in_credit' && (
        <Badge color="success" size="sm">
          In credit
        </Badge>
      )}
      {utilisation.status === 'ok' && (
        <div className="flex w-full max-w-[140px] shrink-0 items-center gap-3">
          <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
            <div
              className={`absolute top-0 left-0 h-full rounded-sm ${utilisationTone(utilisation.percent)}`}
              style={{ width: `${Math.min(100, Math.max(0, utilisation.percent))}%` }}
            />
          </div>
          <p className="w-10 shrink-0 text-right font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {utilisation.percent.toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  )
}

export function AccountsPage() {
  const { loading, availability, methods, methodBalances, combinedCash, utilisationFor, addMethod } = useAccounts()
  const [adding, setAdding] = useState(false)
  const [bankFilter, setBankFilter] = useState<string | null>(null)

  const banks = useMemo(() => {
    const seen = new Map<string, string>()
    for (const m of methods) {
      if (m.provider_slug) seen.set(m.provider_slug, providerFor(m.provider_slug)?.label ?? m.provider_slug)
    }
    return [...seen.entries()]
  }, [methods])

  const filtered = useMemo(
    () => (bankFilter ? methodBalances.filter((mb) => mb.method.provider_slug === bankFilter) : methodBalances),
    [methodBalances, bankFilter],
  )

  const creditCards = useMemo(() => filtered.filter((mb) => mb.method.kind === 'credit_card'), [filtered])

  if (loading) return <PageSkeleton />

  if (availability === 'schema_missing') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="MONEY" title="Accounts" />
        <div className={CARD}>
          <h3 className={CARD_TITLE}>Not set up yet</h3>
          <span className={CARD_SUB}>The account balances migration has not been applied to this project.</span>
          <p className="mt-4 rounded-lg bg-gray-50 p-3 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
            supabase/migrations/20260901000000_account_balances.sql
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="MONEY" title="Accounts" />

      <div className={CARD}>
        <span className={CARD_SUB}>Combined cash</span>
        <h4 className="mt-3 text-2xl font-bold text-gray-800 dark:text-white/90">
          <SensitiveValue>{formatCurrency(combinedCash)}</SensitiveValue>
        </h4>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          Debit accounts only — a credit card's available limit is never counted as cash.
        </p>
      </div>

      {banks.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBankFilter(null)} className={`${FILTER_BTN} ${bankFilter === null ? FILTER_ON : FILTER_OFF}`}>
            All banks
          </button>
          {banks.map(([slug, label]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setBankFilter(slug)}
              className={`${FILTER_BTN} ${bankFilter === slug ? FILTER_ON : FILTER_OFF}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <CardCarousel methodBalances={filtered} onAddCard={() => setAdding(true)} />

      {creditCards.length > 0 && (
        <div className={CARD}>
          <div className="mb-5">
            <h3 className={CARD_TITLE}>Credit utilisation</h3>
            <span className={CARD_SUB}>How much of each limit is currently used</span>
          </div>
          <div className="flex flex-col gap-5">
            {creditCards.map((mb) => (
              <UtilisationRow key={mb.method.id} {...mb} utilisation={utilisationFor(mb.method, mb.latest)} />
            ))}
          </div>
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a card or account">
        <PaymentMethodForm
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            const { error } = await addMethod(input)
            if (error) throw error
            setAdding(false)
          }}
        />
      </Modal>
    </div>
  )
}

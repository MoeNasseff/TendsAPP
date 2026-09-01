import { useState, type FormEvent } from 'react'
import type { CardNetwork, PaymentMethod, PaymentMethodKind } from '../../lib/types'
import { providersOfKind } from './providers'

const FIELD = 'form-input rounded-lg border px-3 py-2 text-sm outline-hidden'
const LABEL = 'text-micro uppercase text-gray-500 dark:text-gray-400'

const KINDS: { value: PaymentMethodKind; label: string }[] = [
  { value: 'bnpl', label: 'Buy now, pay later (ValU, Sympl…)' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
]

const NETWORKS: CardNetwork[] = ['visa', 'mastercard', 'meeza', 'amex']

export type PaymentMethodInput = Omit<PaymentMethod, 'id' | 'user_id' | 'created_at'>

export function PaymentMethodForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: PaymentMethodInput) => Promise<void>
  onCancel: () => void
}) {
  const [kind, setKind] = useState<PaymentMethodKind>('bnpl')
  const [providerSlug, setProviderSlug] = useState('')
  const [label, setLabel] = useState('')
  const [network, setNetwork] = useState<CardNetwork | ''>('')
  const [issuer, setIssuer] = useState('')
  const [last4, setLast4] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCard = kind === 'credit_card' || kind === 'debit_card'
  // A bank account has an identifying last4 too — CIB's current account is
  // stored as last4='6196' (what its SMS actually renders) so incoming
  // messages can resolve to it; see 20260901000000_account_balances.sql.
  // Network/issuer/provider stay card-only — an account has no card network.
  const showLast4 = isCard || kind === 'bank_transfer'
  // Banks are tagged 'credit_card' in PROVIDERS (their card-issuing role),
  // but a bank_transfer account belongs to a bank too — same dropdown, so an
  // account can pick CIB/NBE and get grouped and logo'd with that bank's
  // cards, rather than always falling to "not listed".
  const providers = providersOfKind(isCard || kind === 'bank_transfer' ? 'credit_card' : kind)

  /**
   * Refuses anything longer than four digits rather than truncating it. If a
   * full card number is pasted here, silently keeping the last four would
   * mean the other twelve were typed into an app that promises never to
   * handle them — the user needs to see it rejected.
   */
  function handleLast4(value: string) {
    const digits = value.replace(/\D/g, '')
    if (digits.length > 4) {
      setError('Enter only the last 4 digits. Tend never stores a full card number.')
      return
    }
    setError(null)
    setLast4(digits)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (showLast4 && last4 !== '' && last4.length !== 4) {
      setError('Last 4 digits must be exactly four numbers, or left blank.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        kind,
        provider_slug: providerSlug || null,
        label: label.trim(),
        network: isCard && network ? network : null,
        issuer: isCard ? issuer.trim() || null : null,
        last4: showLast4 && last4 ? last4 : null,
        // Blank means "not recorded", which is stored as null and reads as
        // unknown utilisation — never as a zero limit.
        credit_limit: creditLimit === '' ? null : Number(creditLimit),
        currency: 'EGP',
        statement_day: null,
        due_day: null,
        active: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this method')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label htmlFor="pm-kind" className="flex flex-col gap-1 sm:col-span-2">
        <span className={LABEL}>Type</span>
        <select
          id="pm-kind"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as PaymentMethodKind)
            setProviderSlug('')
          }}
          className={FIELD}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      {providers.length > 0 && (
        <label htmlFor="pm-provider" className="flex flex-col gap-1">
          <span className={LABEL}>Provider</span>
          <select
            id="pm-provider"
            value={providerSlug}
            onChange={(e) => {
              const slug = e.target.value
              setProviderSlug(slug)
              const p = providers.find((x) => x.slug === slug)
              if (p && label.trim() === '') setLabel(p.label)
              if (p && isCard && issuer.trim() === '') setIssuer(p.label)
            }}
            className={FIELD}
          >
            <option value="">Not listed</option>
            {providers.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label htmlFor="pm-label" className="flex flex-col gap-1">
        <span className={LABEL}>Your name for it</span>
        <input
          id="pm-label"
          type="text"
          required
          placeholder="CIB Titanium, ValU…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={FIELD}
        />
      </label>

      {isCard && (
        <>
          <label htmlFor="pm-network" className="flex flex-col gap-1">
            <span className={LABEL}>Network</span>
            <select
              id="pm-network"
              value={network}
              onChange={(e) => setNetwork(e.target.value as CardNetwork | '')}
              className={FIELD}
            >
              <option value="">Not specified</option>
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="pm-issuer" className="flex flex-col gap-1">
            <span className={LABEL}>Issuing bank</span>
            <input
              id="pm-issuer"
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              className={FIELD}
            />
          </label>
        </>
      )}

      {showLast4 && (
        <label htmlFor="pm-last4" className="flex flex-col gap-1">
          <span className={LABEL}>Last 4 digits</span>
          <input
            id="pm-last4"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder={isCard ? '4417' : '6196'}
            value={last4}
            onChange={(e) => handleLast4(e.target.value)}
            className={FIELD}
          />
          {!isCard && (
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              What your bank's own texts show, if it differs from the number you know the account by.
            </span>
          )}
        </label>
      )}

      <label htmlFor="pm-limit" className="flex flex-col gap-1">
        <span className={LABEL}>Credit limit</span>
        <input
          id="pm-limit"
          type="number"
          step="0.01"
          min="0"
          placeholder="Leave blank if unknown"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          className={FIELD}
        />
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          Left blank, utilisation shows as “Limit not set” rather than 0%.
        </span>
      </label>

      <p className="text-theme-xs text-gray-500 dark:text-gray-400 sm:col-span-2">
        Tend stores only the last four digits, and has no field for a full card number, CVV or PIN.
      </p>

      {error && (
        <p className="text-sm text-error-600 dark:text-error-500 sm:col-span-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Add method'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

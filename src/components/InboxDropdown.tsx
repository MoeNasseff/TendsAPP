import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox as InboxIcon } from 'lucide-react'
import { useInbox } from '../modules/inbox/useInbox'
import { formatCurrency } from '../lib/format'
import { ProviderMark } from '../modules/installments/ProviderMark'
import { providerByLabel } from '../modules/installments/providers'

/** "8 min ago" — same shape as NotificationDropdown's own local helper.
 *  Duplicated rather than shared: that file keeps its own copy too, and a
 *  two-call-site utility module isn't worth the indirection. */
function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const days = Math.round(hr / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Bell-style dropdown for pending bank texts, built the same way
 * NotificationDropdown is: same circle button chrome, same orange ping dot,
 * same panel shape — a second notification-style surface next to the first,
 * not folded into it, so "what's due" (reminders) and "what needs review"
 * (inbox) stay visually distinct even though they sit side by side.
 *
 * The full review-and-accept flow (raw text, ExpenseForm, accept/reject)
 * stays on /inbox — this is a glance-and-go panel, not a second copy of it.
 */
export function InboxDropdown() {
  const { pending } = useInbox()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const notifying = pending.length > 0

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bank SMS inbox"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <span className={`absolute right-0 top-0.5 z-1 h-2 w-2 rounded-full bg-orange-400 ${notifying ? 'flex' : 'hidden'}`}>
          <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
        </span>
        <InboxIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg sm:w-[361px] dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">Bank SMS</h5>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close inbox"
              className="text-gray-500 dark:text-gray-400"
            >
              <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                />
              </svg>
            </button>
          </div>

          <ul className="custom-scrollbar flex h-auto flex-col overflow-y-auto">
            {pending.length === 0 ? (
              <li className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                <InboxIcon className="size-8 text-gray-300 dark:text-gray-600" />
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">Nothing waiting.</p>
              </li>
            ) : (
              pending.map((message) => (
                <li key={message.id}>
                  <Link
                    to="/inbox"
                    onClick={() => setOpen(false)}
                    className="flex w-full gap-3 rounded-lg border-b border-gray-100 p-3 text-left hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                  >
                    {(() => {
                      const provider = providerByLabel(message.sender_label)
                      return provider ? (
                        <ProviderMark slug={provider.slug} label={provider.label} size={40} shape="rounded-full" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-400">
                          <InboxIcon className="h-5 w-5" />
                        </span>
                      )
                    })()}
                    <span className="block min-w-0">
                      <span className="mb-1.5 block truncate text-theme-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {message.sender_label ?? 'Unknown sender'}
                        </span>
                        {message.parsed_amount !== null
                          ? ` — ${formatCurrency(message.parsed_amount, message.parsed_currency ?? 'EGP')}`
                          : ' — not parsed yet'}
                        {message.parsed_merchant_raw ? ` at ${message.parsed_merchant_raw}` : ''}
                      </span>
                      <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                        <span>{timeAgo(message.received_at)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>

          <Link
            to="/inbox"
            onClick={() => setOpen(false)}
            className="mt-3 flex justify-center rounded-lg border border-gray-300 bg-white p-3 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            View All
          </Link>
        </div>
      )}
    </div>
  )
}

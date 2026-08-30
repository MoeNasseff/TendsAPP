import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useDueReminders } from '../hooks/useDueReminders'
import { LABEL_BY_MODULE, MOOD_BY_MODULE } from '../lib/moods'
import { NotificationsPanel } from './NotificationsPanel'

/** "8 min ago" — the meta line's right-hand half in TailAdmin's rows. */
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
 * Port of TailAdmin's notification dropdown (the Notification Menu Area inside
 * element 3), owning the bell button as theirs does.
 *
 * Their chrome verbatim: 350px/361px, h-[480px], rounded-2xl, the title row
 * with a close X, a custom-scrollbar list of avatar+text+meta rows, and the
 * full-width "View All Notification" button.
 *
 * Ours: the rows are real due reminders rather than their hardcoded sample
 * users, each row carries Done / Snooze 10m / Snooze 1h, and two buttons are
 * added — "Dismiss all" and "Notification settings", which opens the existing
 * push/Telegram panel. The empty state is also ours; their markup assumes the
 * list is never empty.
 *
 * This is the *complete* reminder surface, not a preview of one. Above sm it
 * is the only one: DueReminderHost's floating stack is sm:hidden, so every
 * action it offers has to exist here or a desktop user could only mass-cancel.
 */
export function NotificationDropdown() {
  const { dueReminders, markDone, snooze, dismissAll } = useDueReminders()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
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

  // Their `notifying` dot, but driven by real state instead of a flag that
  // starts true and is cleared on first open.
  const notifying = dueReminders.length > 0

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <span className={`absolute right-0 top-0.5 z-1 h-2 w-2 rounded-full bg-orange-400 ${notifying ? 'flex' : 'hidden'}`}>
          <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
        </span>
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg sm:w-[361px] dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">Notification</h5>

            <div className="flex items-center gap-2">
              {/* Ours. Previously only reachable from the floating reminder
                  stack, and only once two or more were due. */}
              {dueReminders.length > 0 && (
                <button
                  type="button"
                  onClick={dismissAll}
                  className="rounded-lg px-2 py-1 text-theme-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                >
                  Dismiss all
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
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
          </div>

          <ul className="custom-scrollbar flex h-auto flex-col overflow-y-auto">
            {dueReminders.length === 0 ? (
              <li className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                <Bell className="size-8 text-gray-300 dark:text-gray-600" />
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  You&apos;re all caught up.
                </p>
              </li>
            ) : (
              dueReminders.map((r) => (
                <li
                  key={r.id}
                  data-mood={MOOD_BY_MODULE[r.source_module]}
                  className="flex gap-3 border-b border-gray-100 p-3 dark:border-gray-800"
                >
                  <span className="relative z-1 block h-10 w-full max-w-10 rounded-full">
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="h-10 w-10 overflow-hidden rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mood-accent/10 text-mood-accent">
                        <Bell className="h-5 w-5" />
                      </span>
                    )}
                    <span className="absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white bg-mood-accent dark:border-gray-900"></span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-800 dark:text-white/90">{r.title}</span>
                      {r.body ? ` — ${r.body}` : ''}
                    </p>
                    <p className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                      <span>{LABEL_BY_MODULE[r.source_module]}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                      <span>{timeAgo(r.fire_at)}</span>
                    </p>

                    {/* The row itself is no longer a button. It used to be one
                        whose only behaviour was closing the panel, and these
                        three could not live inside it — a <button> nested in a
                        <button> is invalid and the click targets fight.
                        Deliberately not closing the panel either: clearing
                        three reminders should be three taps. */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => markDone(r.id)}
                        className="rounded-lg bg-mood-accent px-3 py-1 text-theme-xs font-medium text-white"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => snooze(r.id, 10)}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-theme-xs text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
                      >
                        Snooze 10m
                      </button>
                      <button
                        type="button"
                        onClick={() => snooze(r.id, 60)}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-theme-xs text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
                      >
                        Snooze 1h
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Ours, above their footer button: the push/Telegram panel had no
              entry point left once the bell opened this instead. */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setSettingsOpen(true)
            }}
            className="mt-3 flex justify-center rounded-lg p-2 text-theme-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Notification settings
          </button>

          {/* Their footer button. /notifications is in the UI Elements menu but
              has no page yet, so it lands on ComingSoon via the catch-all. */}
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex justify-center rounded-lg border border-gray-300 bg-white p-3 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            View All Notification
          </Link>
        </div>
      )}

      <NotificationsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

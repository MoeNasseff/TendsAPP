import { Bell } from 'lucide-react'
import { useDueReminders } from '../hooks/useDueReminders'
import { LABEL_BY_MODULE, MOOD_BY_MODULE } from '../lib/moods'

// Setting data-mood per card scopes --mood-accent to that card, so the
// mood-accent utilities below colour themselves per module. DueReminderHost
// renders from AppShell, outside every MoodLayout wrapper, so without it the
// cards fall back to the neutral :root palette instead of their own.
export function DueReminderHost() {
  const { dueReminders, markDone, snooze, dismissAll } = useDueReminders()

  if (dueReminders.length === 0) return null

  return (
    // top-20 clears the header, which is 77px tall at lg and sits at
    // z-99999 — well above this stack. At top-4 the first child (the
    // "N reminders due / Dismiss all" bar) rendered entirely behind it and
    // read as a missing button. 80px also clears the 64px mobile header.
    <div className="fixed inset-x-0 top-20 z-[90] mx-auto flex w-full max-w-sm flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:mx-0">
      {/* Deliberately not mood-coloured: this bar spans every module, so it
          stays neutral and leans on weight/contrast to stand out instead. */}
      {dueReminders.length > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-theme-xl dark:border-white/10 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {dueReminders.length} reminders due
          </p>
          {/* Was white-on-white in light mode: text-slate-100 over the card's
              bg-white, with a white/10 fill and white/25 ring that had nothing
              to sit against. Takes the theme's outline-button treatment now. */}
          <button
            type="button"
            onClick={dismissAll}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-800 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Dismiss all
          </button>
        </div>
      )}
      {dueReminders.map((r) => (
        <div
          key={r.id}
          data-mood={MOOD_BY_MODULE[r.source_module]}
          className="animate-toast-in flex items-start gap-3 rounded-xl border border-gray-200 border-l-[6px] border-l-brand-500 bg-white p-4 shadow-theme-xl dark:border-white/10 dark:border-l-brand-400 dark:bg-gray-800 dark:shadow-none"
        >
          {r.image_url ? (
            <img src={r.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mood-accent/10 text-mood-accent ring-1 ring-inset ring-mood-accent/40">
              <Bell className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {/* Solid fill by choice — the tab colour should be unmissable here,
                not a tint competing with the card's own surface. */}
            <span className="mb-1 inline-block rounded-full bg-mood-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {LABEL_BY_MODULE[r.source_module]}
            </span>
            <p className="font-semibold text-gray-800 dark:text-white/90">{r.title}</p>
            {r.body && <p className="text-sm text-gray-500 dark:text-gray-400">{r.body}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => markDone(r.id)}
                className="rounded-lg bg-mood-accent px-3 py-1 text-xs font-medium text-white"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => snooze(r.id, 10)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
              >
                Snooze 10m
              </button>
              <button
                type="button"
                onClick={() => snooze(r.id, 60)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
              >
                Snooze 1h
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

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
    <div className="fixed inset-x-0 top-4 z-[90] mx-auto flex w-full max-w-sm flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:mx-0">
      {/* Deliberately not mood-coloured: this bar spans every module, so it
          stays neutral and leans on weight/contrast to stand out instead. */}
      {dueReminders.length > 1 && (
        <div className="glass flex items-center justify-between rounded-xl border px-4 py-2.5 shadow-xl">
          <p className="text-sm font-semibold text-slate-100">{dueReminders.length} reminders due</p>
          <button
            type="button"
            onClick={dismissAll}
            className="rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-white/25 transition-colors hover:bg-white/20 hover:ring-white/40"
          >
            Dismiss all
          </button>
        </div>
      )}
      {dueReminders.map((r) => (
        <div
          key={r.id}
          data-mood={MOOD_BY_MODULE[r.source_module]}
          className="glass animate-toast-in flex items-start gap-3 rounded-xl border border-l-[6px] border-l-mood-accent p-4 shadow-xl"
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
            <p className="font-semibold text-slate-100">{r.title}</p>
            {r.body && <p className="text-sm text-slate-400">{r.body}</p>}
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
                className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/5"
              >
                Snooze 10m
              </button>
              <button
                type="button"
                onClick={() => snooze(r.id, 60)}
                className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/5"
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

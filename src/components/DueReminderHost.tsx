import { Bell } from 'lucide-react'
import { useDueReminders } from '../hooks/useDueReminders'

export function DueReminderHost() {
  const { dueReminders, markDone, snooze } = useDueReminders()

  if (dueReminders.length === 0) return null

  return (
    <div className="fixed inset-x-0 top-4 z-[90] mx-auto flex w-full max-w-sm flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:mx-0">
      {dueReminders.map((r) => (
        <div key={r.id} className="glass animate-toast-in flex items-start gap-3 rounded-xl border p-4 shadow-xl">
          {r.image_url ? (
            <img src={r.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mood-accent/10 text-mood-accent">
              <Bell className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-100">{r.title}</p>
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

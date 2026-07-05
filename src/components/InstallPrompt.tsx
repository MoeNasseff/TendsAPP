import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { onInstallAvailabilityChange, promptInstall } from '../lib/pwa'

export function InstallPrompt() {
  const [available, setAvailable] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubscribe = onInstallAvailabilityChange(setAvailable)
    return () => {
      unsubscribe()
    }
  }, [])

  if (!available || dismissed) return null

  return (
    <div className="glass fixed inset-x-4 bottom-20 z-[80] flex items-center gap-3 rounded-xl border p-3 shadow-xl sm:inset-x-auto sm:bottom-4 sm:left-60 sm:max-w-sm">
      <Download className="h-5 w-5 shrink-0 text-mood-accent" />
      <p className="flex-1 text-sm text-slate-300">Install this app for quick access and push reminders.</p>
      <button
        type="button"
        onClick={() => promptInstall().then(() => setDismissed(true))}
        className="shrink-0 rounded-lg bg-mood-accent px-3 py-1.5 text-xs font-medium text-white"
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install prompt"
        className="shrink-0 text-slate-500 hover:text-slate-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

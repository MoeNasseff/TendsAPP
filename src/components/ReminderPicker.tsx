import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { ReminderChannel, ReminderSourceModule } from '../lib/types'
import { MOOD_BY_MODULE } from '../lib/moods'
import { DUR, EASE } from '../lib/motion'
import { Portal } from './Portal'

const CHANNELS: ReminderChannel[] = ['telegram', 'push', 'email', 'whatsapp']

export function ReminderPicker({
  open,
  onClose,
  sourceModule,
  sourceId,
  defaultTitle,
  defaultBody,
  defaultImageUrl,
}: {
  open: boolean
  onClose: () => void
  sourceModule: ReminderSourceModule
  sourceId: string
  defaultTitle: string
  defaultBody?: string | null
  defaultImageUrl?: string | null
}) {
  const { user } = useAuth()
  const showToast = useToast()
  const [fireAt, setFireAt] = useState('')
  const [channels, setChannels] = useState<ReminderChannel[]>(['push'])
  const [submitting, setSubmitting] = useState(false)
  const reduce = useReducedMotion()

  function toggleChannel(c: ReminderChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !fireAt || channels.length === 0) {
      showToast('Pick a date/time and at least one channel', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      source_module: sourceModule,
      source_id: sourceId,
      title: defaultTitle,
      body: defaultBody ?? null,
      image_url: defaultImageUrl ?? null,
      fire_at: new Date(fireAt).toISOString(),
      channels,
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Reminder set', 'success')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          {/* Portal renders into document.body, which is outside the MoodLayout
              wrapper the calling page sits in — so the module accent has to be
              re-established here from sourceModule. */}
          <motion.div
            data-mood={MOOD_BY_MODULE[sourceModule]}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: DUR.base, ease: EASE }}
              className="glass w-full max-w-sm rounded-2xl border p-6"
              onClick={(e) => e.stopPropagation()}
            >
          <h3 className="mb-4 text-base font-semibold text-slate-100">Set reminder — {defaultTitle}</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="datetime-local"
              required
              value={fireAt}
              onChange={(e) => setFireAt(e.target.value)}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
            />
            <div>
              <p className="mb-1.5 text-xs text-slate-500">Channels</p>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleChannel(c)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      channels.includes(c) ? 'bg-mood-accent text-white' : 'border border-white/10 text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-white/5">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-mood-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Set reminder'}
              </button>
            </div>
          </form>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  )
}

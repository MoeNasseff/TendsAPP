import { useEffect, useState } from 'react'
import { Send, CheckCircle2, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getTelegramConnectUrl } from '../lib/notify'
import { isPushSubscribed, subscribeToPush } from '../lib/pwa'
import { Portal } from './Portal'

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const showToast = useToast()
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setTelegramChatId(data?.telegram_chat_id ?? null))
    isPushSubscribed().then(setPushEnabled)
  }, [open, user])

  if (!open || !user) return null

  const connectUrl = getTelegramConnectUrl(user.id)

  async function handleEnablePush() {
    setSubscribing(true)
    try {
      await subscribeToPush(user!.id)
      setPushEnabled(true)
      showToast('Push notifications enabled', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to enable push notifications', 'error')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="glass w-full max-w-sm rounded-2xl border p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="mb-4 text-base font-semibold text-slate-100">Notifications</h3>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-mood-accent" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Push notifications</p>
                  <p className="text-xs text-slate-500">{pushEnabled ? 'Enabled' : 'Not enabled'}</p>
                </div>
              </div>
              {pushEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={subscribing}
                  className="rounded-lg bg-mood-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {subscribing ? 'Enabling…' : 'Enable'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-mood-accent" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Telegram</p>
                  <p className="text-xs text-slate-500">{telegramChatId ? 'Connected' : 'Not connected'}</p>
                </div>
              </div>
              {telegramChatId ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : connectUrl ? (
                <a
                  href={connectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-mood-accent px-3 py-1.5 text-xs font-medium text-white"
                >
                  Connect
                </a>
              ) : (
                <span className="text-xs text-slate-600">Unavailable</span>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Email reminders require SMTP to be configured by the app owner.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-slate-400 hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    </Portal>
  )
}

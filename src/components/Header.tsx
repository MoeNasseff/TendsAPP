import { useState } from 'react'
import { Bell, LogOut } from 'lucide-react'
import { useBrand } from '../hooks/useBrand'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import { NotificationsPanel } from './NotificationsPanel'

export function Header() {
  const brand = useBrand()
  const { session } = useAuth()
  const showToast = useToast()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) showToast(error.message, 'error')
  }

  return (
    <header className="glass sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <img src={brand.logo.src} alt={brand.logo.alt} className="h-8 w-auto" />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-brand-primary"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        {session && (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-red-400"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </header>
  )
}

import { useState } from 'react'
import { Bell, Eye, EyeOff } from 'lucide-react'
import { useBrand } from '../hooks/useBrand'
import { usePrivacy } from '../hooks/usePrivacy'
import { NotificationsPanel } from './NotificationsPanel'
import { UserAvatar } from './UserAvatar'

const ICON_BUTTON =
  'tap-target rounded-lg p-2 text-black/40 transition-colors duration-fast ease-out-expo hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white'

export function Header() {
  const brand = useBrand()
  const { hidden, toggle } = usePrivacy()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return (
    <header className="glass sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 sm:px-8">
      <div className="flex items-center gap-2">
        <img src={brand.logo.src} alt={brand.logo.alt} className="h-8 w-auto" />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          className={ICON_BUTTON}
          title={hidden ? 'Show amounts' : 'Hide amounts'}
          aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
          aria-pressed={hidden}
        >
          {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className={ICON_BUTTON}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <UserAvatar />
      </div>
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </header>
  )
}

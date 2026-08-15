import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav-items'

export function BottomNav() {
  return (
    // pb picks up the iOS home-indicator inset so the labels are not sitting
    // under it when the PWA runs standalone.
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon, mood }) => (
        <NavLink
          key={to}
          to={to}
          data-mood={mood}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1.5 rounded-lg px-3 py-1.5 text-micro uppercase transition-colors duration-fast ease-out-expo ${
              isActive ? 'text-mood-accent-safe' : 'text-white/50'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

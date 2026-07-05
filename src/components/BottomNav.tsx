import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav-items'

export function BottomNav() {
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t px-2 py-2 sm:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon, mood }) => (
        <NavLink
          key={to}
          to={to}
          data-mood={mood}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              isActive ? 'text-mood-accent' : 'text-slate-500'
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

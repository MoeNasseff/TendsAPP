import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav-items'
import { useBrand } from '../hooks/useBrand'

export function Sidebar() {
  const brand = useBrand()

  return (
    <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r px-4 py-6 sm:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <img src={brand.logo.src} alt={brand.logo.alt} className="h-8 w-auto" />
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, mood }) => (
          <NavLink
            key={to}
            to={to}
            data-mood={mood}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-mood-accent/10 text-mood-accent'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

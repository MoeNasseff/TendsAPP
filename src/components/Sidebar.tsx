import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV_ITEMS } from './nav-items'
import { UserAvatar } from './UserAvatar'
import { useBrand } from '../hooks/useBrand'
import { useSidebar } from '../hooks/useSidebar'

export function Sidebar() {
  const brand = useBrand()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={`glass fixed inset-y-0 left-0 z-30 hidden flex-col border-r py-8 transition-[width] duration-base ease-out-expo sm:flex ${
        collapsed ? 'w-16 px-2' : 'w-56 px-4'
      }`}
    >
      <div className={`mb-10 flex items-center px-3 ${collapsed ? 'flex-col gap-3' : 'justify-between gap-2'}`}>
        <img
          src={collapsed ? brand.favicon : brand.logo.src}
          alt={brand.logo.alt}
          className={collapsed ? 'h-7 w-7' : 'h-8 w-auto'}
        />
        <button
          type="button"
          onClick={toggle}
          className="tap-target rounded-lg p-1.5 text-white/40 transition-colors duration-fast ease-out-expo hover:bg-white/5 hover:text-white"
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav id="sidebar-nav" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, mood }) => (
          <NavLink
            key={to}
            to={to}
            data-mood={mood}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              // A left rule plus a weight/colour shift, rather than a filled
              // pill: the accent stays sparing, which is what makes it read.
              // The rule survives collapse — it is the only active-state
              // signal left once the label disappears.
              `flex items-center border-l-2 py-2.5 text-sm transition-colors duration-fast ease-out-expo ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3'
              } ${
                isActive
                  ? 'border-mood-accent bg-white/[0.03] font-medium text-white'
                  : 'border-transparent text-white/50 hover:text-white/75'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-white/5 pt-3">
        <UserAvatar variant="sidebar" collapsed={collapsed} />
      </div>
    </aside>
  )
}

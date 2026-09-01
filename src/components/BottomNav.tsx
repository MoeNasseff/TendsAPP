import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { NAV_ITEMS } from './nav-items'

/**
 * Floating pill, not a bar flush to the bottom edge (Session 31). Three
 * things carried over from the old edge-to-edge bar:
 *  - `glass` (index.css) for the translucent surface — not hand-rolled.
 *  - `env(safe-area-inset-bottom)`, now folded into the pill's own bottom
 *    offset instead of its padding, so it still clears the iOS home indicator.
 *  - `sm:hidden`, paired with DueReminderHost's own `sm:hidden` (S29) so the
 *    two mobile-only chrome layers appear and disappear together. Unchanged
 *    here, so DueReminderHost needs no matching edit this session.
 *
 * The active tab's circle is the fixed Tend brand colour (`bg-brand-500`) on
 * every tab, not the module's own mood colour — a deliberate departure from
 * the mood system, same reasoning as DueReminderHost's neutral "N due" bar:
 * this nav spans all five modules, so a circle that changed colour between
 * tabs would read as five different components. `data-mood` is dropped
 * entirely — nothing in the old markup consumed it either; the label/icon
 * colours were always hardcoded brand-500/gray, never `mood-accent`.
 */
export function BottomNav() {
  const reduceMotion = useReducedMotion()

  return (
    <nav className="glass fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-around gap-1 rounded-full border px-2 py-2 shadow-theme-lg sm:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            `relative flex flex-1 flex-col items-center gap-1 py-1 text-micro uppercase transition-colors duration-fast ease-out-expo ${
              isActive ? 'text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* h-11 w-11 (44px) — bigger than the icon alone, and already the
                  WCAG/Apple HIG touch-target floor, so no separate .tap-target
                  hit-area expansion is needed on top of it. */}
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full">
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active-circle"
                    className="absolute inset-0 rounded-full bg-brand-500"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 32 }}
                  />
                )}
                <Icon className={`relative h-5 w-5 ${isActive ? 'text-white' : ''}`} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

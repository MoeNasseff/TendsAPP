import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Backdrop } from './Backdrop'
import { BottomNav } from './BottomNav'
import { DueReminderHost } from './DueReminderHost'
import { InstallPrompt } from './InstallPrompt'
import { fadeUp } from '../lib/motion'
import { useSidebar } from '../hooks/useSidebar'

/**
 * Port of TailAdmin's AppLayout (layout/AppLayout.tsx): sidebar + backdrop in
 * one column, header + content in the other, with the content column's left
 * margin tracking the sidebar's width.
 *
 * The margin values are hardcoded against Sidebar's own w-[290px]/w-[90px], so
 * the two must always change together — which is why both read the same store
 * rather than each keeping their own idea of the width.
 *
 * Tend keeps three things TailAdmin has no equivalent for: BottomNav (the
 * mobile tab bar), DueReminderHost and InstallPrompt.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const reduce = useReducedMotion()
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  return (
    <div className="min-h-svh bg-brand-secondary text-gray-700 xl:flex dark:text-gray-300">
      <div>
        <Sidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? 'xl:ml-[290px]' : 'xl:ml-[90px]'
        } ${isMobileOpen ? 'ml-0' : ''}`}
      >
        <Header />
        {/* Matches the reference's content wrapper — `p-4 pb-20 md:p-6 md:pb-6`
            — in every direction but one, so cloned pages sit on the spacing
            they were designed against rather than a rhythm inherited from
            Tend's pre-redesign look.
            The exception is the bottom edge below `sm`, where BottomNav is a
            floating pill TailAdmin has no equivalent for. A pill inset from
            the edge occupies MORE total space than a bar flush to it did —
            roughly 78px of pill plus its own 12px bottom offset, ~90px total —
            so this padding grew from 6rem to 7rem to keep the same clearance
            margin the flush bar had. From `sm` up BottomNav is hidden
            (`sm:hidden`) and the reference's own values take over exactly. */}
        <main className="mx-auto max-w-(--breakpoint-2xl) p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-4 md:p-6 md:pb-6">
          {reduce ? (
            children
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...fadeUp}>
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
      <BottomNav />
      <DueReminderHost />
      <InstallPrompt />
    </div>
  )
}

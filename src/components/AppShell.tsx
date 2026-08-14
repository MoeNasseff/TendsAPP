import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { DueReminderHost } from './DueReminderHost'
import { InstallPrompt } from './InstallPrompt'
import { fadeUp } from '../lib/motion'
import { useSidebar } from '../hooks/useSidebar'

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const reduce = useReducedMotion()
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-svh bg-brand-secondary text-slate-200">
      <Sidebar />
      {/* sm:pl-* is hardcoded against Sidebar's own width — the two must
          always move together, so both read off the same store. */}
      <div className={`transition-[padding-left] duration-base ease-out-expo ${collapsed ? 'sm:pl-16' : 'sm:pl-56'}`}>
        <Header />
        {/* Generous vertical rhythm is load-bearing for this design — the
            sections need room to breathe or the density reads as a dashboard
            dump again. Bottom padding clears the mobile nav and its inset. */}
        <main className="mx-auto max-w-5xl px-4 pt-10 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-12 sm:pb-16">
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

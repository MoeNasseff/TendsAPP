import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { DueReminderHost } from './DueReminderHost'
import { InstallPrompt } from './InstallPrompt'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-brand-secondary text-slate-200">
      <Sidebar />
      <div className="sm:pl-56">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pb-10">{children}</main>
      </div>
      <BottomNav />
      <DueReminderHost />
      <InstallPrompt />
    </div>
  )
}

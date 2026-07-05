import type { LucideIcon } from 'lucide-react'
import { GlassCard } from './GlassCard'

export function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <GlassCard className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mood-accent/10 text-mood-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs text-slate-500">{label}</div>
        <div className="truncate text-lg font-semibold text-slate-100">{value}</div>
      </div>
    </GlassCard>
  )
}

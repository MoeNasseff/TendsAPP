function statusColor(fraction: number) {
  if (fraction <= 0) return '#ef4444'
  if (fraction < 0.15) return '#ef4444'
  if (fraction < 0.35) return '#f59e0b'
  return '#22c55e'
}

export function OdometerGauge({
  label,
  kmRemaining,
  intervalKm,
}: {
  label: string
  kmRemaining: number
  intervalKm: number
}) {
  const fraction = intervalKm > 0 ? Math.max(0, Math.min(1, kmRemaining / intervalKm)) : 0
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - fraction)
  const color = statusColor(kmRemaining <= 0 ? 0 : fraction)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[140px] w-[140px]">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-100">
            {kmRemaining <= 0 ? 'Overdue' : kmRemaining.toLocaleString()}
          </span>
          {kmRemaining > 0 && <span className="text-xs text-slate-500">km left</span>}
        </div>
      </div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </div>
  )
}

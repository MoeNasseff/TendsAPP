export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card h-24 animate-pulse rounded-2xl border" />
        ))}
      </div>
      <div className="surface-card h-48 animate-pulse rounded-2xl border" />
      <div className="surface-card h-64 animate-pulse rounded-2xl border" />
    </div>
  )
}

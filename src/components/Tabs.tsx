export interface TabItem {
  id: string
  label: string
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/5 bg-surface-lowest p-1 text-sm">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-lg py-2 text-label font-medium uppercase transition-colors duration-fast ease-out-expo ${
            active === t.id
              ? 'bg-surface-bright text-white'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

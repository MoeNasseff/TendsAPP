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
    <div className="flex gap-1 rounded-xl border border-white/5 bg-black/20 p-1 text-sm">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${
            active === t.id ? 'bg-mood-accent text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

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
    <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 text-sm dark:border-white/5 dark:bg-white/5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-lg py-2 text-label font-medium uppercase transition-colors duration-fast ease-out-expo ${
            active === t.id
              ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-white/10 dark:text-white dark:shadow-none'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

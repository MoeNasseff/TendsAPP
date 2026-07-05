import { useMemo, useState } from 'react'
import { CalendarClock, AlertTriangle, ListChecks, CheckCircle2, Trash2, Pencil, Bell, Check } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import { GlassCard } from '../../components/GlassCard'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageSkeleton } from '../../components/PageSkeleton'
import { Tabs } from '../../components/Tabs'
import { ReminderPicker } from '../../components/ReminderPicker'
import { formatDateTime, getTimeLeft } from '../../lib/format'
import { useDog } from './useDog'
import { DogItemForm } from './DogItemForm'
import { DogHeroBackground } from './DogHeroBackground'
import type { DogItem } from '../../lib/types'

type TabId = 'vaccines' | 'medicines' | 'schedule'

export function DogPage() {
  const { dog, items, loading, addItem, updateItem, deleteItem, markDone } = useDog()
  const [tab, setTab] = useState<TabId>('vaccines')
  const [editing, setEditing] = useState<DogItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DogItem | null>(null)
  const [reminderTarget, setReminderTarget] = useState<DogItem | null>(null)

  const stats = useMemo(() => {
    const now = Date.now()
    const in30d = now + 30 * 86_400_000
    const active = items.filter((i) => i.active)
    const upcoming = active.filter((i) => i.due_at && new Date(i.due_at).getTime() >= now && new Date(i.due_at).getTime() <= in30d)
    const overdue = active.filter((i) => i.due_at && new Date(i.due_at).getTime() < now)
    const doneThisMonth = items.filter((i) => {
      if (!i.last_done_at) return false
      const d = new Date(i.last_done_at)
      const ref = new Date()
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
    })
    return { upcoming: upcoming.length, overdue: overdue.length, active: active.length, done: doneThisMonth.length }
  }, [items])

  const visibleItems = useMemo(() => {
    if (tab === 'vaccines') return items.filter((i) => i.kind === 'vaccine')
    if (tab === 'medicines') return items.filter((i) => i.kind === 'medicine')
    return [...items].filter((i) => i.active).sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))
  }, [items, tab])

  async function handleSubmit(input: Parameters<typeof addItem>[0]) {
    if (editing) {
      await updateItem(editing.id, input)
      setEditing(null)
    } else {
      await addItem(input)
    }
  }

  if (loading) return <PageSkeleton />
  if (!dog) return <EmptyState icon={ListChecks} title="No dog yet" description="Your dog will appear here once seeded." />

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="relative overflow-hidden">
        <DogHeroBackground />
        <div className="relative flex items-center gap-3">
          {dog.photo_url && <img src={dog.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />}
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{dog.name}</h2>
            <p className="text-sm text-slate-400">{dog.breed}</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Upcoming (30d)" value={stats.upcoming} icon={CalendarClock} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} />
        <StatCard label="Active items" value={stats.active} icon={ListChecks} />
        <StatCard label="Done this month" value={stats.done} icon={CheckCircle2} />
      </div>

      <Tabs
        tabs={[
          { id: 'vaccines', label: 'Vaccines' },
          { id: 'medicines', label: 'Medicines' },
          { id: 'schedule', label: 'Schedule' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      <GlassCard>
        {visibleItems.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nothing here yet" />
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {visibleItems.map((item) => {
              const isOverdue = item.active && item.due_at && new Date(item.due_at).getTime() < Date.now()
              return (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  {item.image_url && <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-slate-100">{item.name}</p>
                      {!item.active && <span className="text-xs text-slate-600">(done)</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.dose ? `${item.dose} · ` : ''}
                      {item.due_at ? (
                        <span className={isOverdue ? 'text-red-400' : ''}>
                          {isOverdue ? 'Overdue' : getTimeLeft(new Date(item.due_at))} · {formatDateTime(item.due_at)}
                        </span>
                      ) : (
                        'No due date'
                      )}
                    </p>
                  </div>
                  {item.active && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReminderTarget(item)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-mood-accent"
                        title="Set reminder"
                        aria-label={`Set reminder for ${item.name}`}
                      >
                        <Bell className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => markDone(item)}
                        className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:border-mood-accent hover:text-mood-accent"
                        title="Mark done"
                      >
                        <Check className="h-3.5 w-3.5" /> Done
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    aria-label={`Edit ${item.name}`}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-mood-accent"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Delete ${item.name}`}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      <DogItemForm editing={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete item?"
        message="This can't be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteItem(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />

      {reminderTarget && (
        <ReminderPicker
          open={!!reminderTarget}
          onClose={() => setReminderTarget(null)}
          sourceModule="dog"
          sourceId={reminderTarget.id}
          defaultTitle={reminderTarget.name}
          defaultBody={reminderTarget.description}
          defaultImageUrl={reminderTarget.image_url}
        />
      )}
    </div>
  )
}

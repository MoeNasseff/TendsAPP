import { useMemo, useState } from 'react'
import { CalendarClock, AlertTriangle, ListChecks, CheckCircle2, Trash2, Pencil, Bell, Check, Plus } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { StatGrid } from '../../components/StatGrid'
import { Modal } from '../../components/Modal'
import { DataGrid, type DataGridColumn } from '../../components/DataGrid'
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

interface DogItemRow {
  id: string
  name: string
  dose: string
  due_at: string | null
  active: boolean
}

type TabId = 'vaccines' | 'medicines' | 'schedule'

export function DogPage() {
  const { dog, items, loading, addItem, updateItem, deleteItem, markDone } = useDog()
  const [tab, setTab] = useState<TabId>('vaccines')
  const [editing, setEditing] = useState<DogItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DogItem | null>(null)
  const [reminderTarget, setReminderTarget] = useState<DogItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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
    setFormOpen(false)
  }

  const itemRows = useMemo<DogItemRow[]>(
    () =>
      visibleItems.map((i) => ({
        id: i.id,
        name: i.name,
        dose: i.dose ?? '',
        due_at: i.due_at,
        active: i.active,
      })),
    [visibleItems],
  )

  const itemColumns = useMemo<DataGridColumn<DogItemRow>[]>(
    () => [
      { data: 'name', title: 'Name', format: (v, row) => (row.active ? String(v) : `${v} (done)`) },
      { data: 'dose', title: 'Dose', format: (v) => (v as string) || '—' },
      {
        data: 'due_at',
        title: 'Due',
        format: (v, row) => {
          if (!v) return 'No due date'
          const due = new Date(v as string)
          const isOverdue = row.active && due.getTime() < Date.now()
          return isOverdue ? 'Overdue' : `${getTimeLeft(due)} · ${formatDateTime(v as string)}`
        },
      },
    ],
    [],
  )

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  if (loading) return <PageSkeleton />
  if (!dog) return <EmptyState icon={ListChecks} title="No dog yet" description="Your dog will appear here once seeded." />

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="CARE PROTOCOL"
        title="Dog"
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            aria-label="Add item"
            className="rounded-lg bg-brand-500 p-2 text-white transition-colors duration-fast ease-out-expo hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />

      <Card className="relative overflow-hidden">
        <DogHeroBackground />
        <div className="relative flex items-center gap-3">
          {dog.photo_url && <img src={dog.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />}
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{dog.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{dog.breed}</p>
          </div>
        </div>
      </Card>

      <StatGrid>
        <StatCard label="Upcoming (30d)" value={stats.upcoming} icon={CalendarClock} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} />
        <StatCard label="Active items" value={stats.active} icon={ListChecks} />
        <StatCard label="Done this month" value={stats.done} icon={CheckCircle2} />
      </StatGrid>

      <Tabs
        tabs={[
          { id: 'vaccines', label: 'Vaccines' },
          { id: 'medicines', label: 'Medicines' },
          { id: 'schedule', label: 'Schedule' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      <Card>
        {itemRows.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nothing here yet" />
        ) : (
          <DataGrid
            columns={itemColumns}
            data={itemRows}
            renderActions={(row) => {
              const item = itemById.get(row.id)
              if (!item) return null
              return (
                <div className="flex justify-end gap-2">
                  {item.active && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReminderTarget(item)}
                        className="tap-target rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-brand-400"
                        title="Set reminder"
                        aria-label={`Set reminder for ${item.name}`}
                      >
                        <Bell className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => markDone(item)}
                        className="tap-target flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:border-brand-500 hover:text-brand-500 dark:border-white/10 dark:text-gray-400 dark:hover:border-brand-400 dark:hover:text-brand-400"
                        title="Mark done"
                      >
                        <Check className="h-3.5 w-3.5" /> Done
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(item)
                      setFormOpen(true)
                    }}
                    aria-label={`Edit ${item.name}`}
                    className="tap-target rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-brand-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Delete ${item.name}`}
                    className="tap-target rounded-lg p-1.5 text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            }}
          />
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit item' : 'Add item'}
      >
        <DogItemForm
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

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

import { useCallback, useMemo, useState } from 'react'
import { Pill, CheckCircle2, AlertTriangle, TrendingUp, Check, Undo2, Plus } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { StatGrid } from '../../components/StatGrid'
import { Section } from '../../components/Section'
import { Modal } from '../../components/Modal'
import { DataGrid, type DataGridColumn } from '../../components/DataGrid'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageSkeleton } from '../../components/PageSkeleton'
import { useMeds } from './useMeds'
import { MedForm } from './MedForm'
import type { Med } from '../../lib/types'

interface MedRow {
  id: string
  name: string
  dosage: string
  times: string
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function MedsPage() {
  const { meds, todayLogs, last7DaysLogs, loading, addMed, updateMed, deleteMed, markTaken, undoTaken } = useMeds()
  const [editing, setEditing] = useState<Med | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Med | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const todaySlots = useMemo(() => {
    const weekday = new Date().getDay()
    const slots: { med: Med; time: string }[] = []
    for (const med of meds) {
      if (!med.active || !med.days_of_week.includes(weekday)) continue
      for (const time of med.times_of_day) {
        slots.push({ med, time })
      }
    }
    return slots.sort((a, b) => a.time.localeCompare(b.time))
  }, [meds])

  const findLog = useCallback(
    (medId: string, time: string) => todayLogs.find((l) => l.med_id === medId && l.scheduled_for.slice(11, 16) === time),
    [todayLogs],
  )

  const stats = useMemo(() => {
    const now = new Date()
    let taken = 0
    let missed = 0
    for (const slot of todaySlots) {
      const log = findLog(slot.med.id, slot.time)
      if (log) {
        taken++
        continue
      }
      const scheduled = new Date(`${todayKey()}T${slot.time}:00`)
      if (scheduled < now) missed++
    }

    let expected = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const weekday = d.getDay()
      for (const med of meds) {
        if (med.active && med.days_of_week.includes(weekday)) expected += med.times_of_day.length
      }
    }
    const adherence = expected > 0 ? Math.round((last7DaysLogs.length / expected) * 100) : 0

    return { total: todaySlots.length, taken, missed, adherence }
  }, [todaySlots, findLog, last7DaysLogs, meds])

  async function handleSubmit(input: Parameters<typeof addMed>[0]) {
    if (editing) {
      await updateMed(editing.id, input)
      setEditing(null)
    } else {
      await addMed(input)
    }
    setFormOpen(false)
  }

  const medRows = useMemo<MedRow[]>(
    () =>
      meds.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage ?? '',
        times: m.times_of_day.join(', ') || 'As needed',
      })),
    [meds],
  )

  const medColumns = useMemo<DataGridColumn<MedRow>[]>(
    () => [
      { data: 'name', title: 'Name' },
      { data: 'dosage', title: 'Dosage', format: (v) => (v as string) || '—' },
      { data: 'times', title: 'Times' },
    ],
    [],
  )

  const medById = useMemo(() => new Map(meds.map((m) => [m.id, m])), [meds])

  if (loading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="SCHEDULE"
        title="Meds"
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            aria-label="Add med"
            className="rounded-lg bg-mood-accent p-2 text-white transition-opacity duration-fast ease-out-expo hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />

      <StatGrid>
        <StatCard label="Doses today" value={stats.total} icon={Pill} />
        <StatCard label="Taken" value={stats.taken} icon={CheckCircle2} />
        <StatCard label="Missed" value={stats.missed} icon={AlertTriangle} />
        <StatCard label="Adherence (7d)" value={`${stats.adherence}%`} icon={TrendingUp} />
      </StatGrid>

      <Section title="Today's checklist">
        <Card>
        {todaySlots.length === 0 ? (
          <EmptyState icon={Pill} title="No meds scheduled for today" />
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {todaySlots.map((slot) => {
              const log = findLog(slot.med.id, slot.time)
              const isPast = new Date(`${todayKey()}T${slot.time}:00`) < new Date()
              return (
                <div key={`${slot.med.id}-${slot.time}`} className="flex items-center gap-3 py-3">
                  {slot.med.image_url && (
                    <img src={slot.med.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-100">
                      {slot.med.name} <span className="text-slate-500">· {slot.time}</span>
                    </p>
                    {slot.med.dosage && <p className="text-xs text-slate-500">{slot.med.dosage}</p>}
                  </div>
                  {!log && isPast && <span className="text-xs text-red-400">Missed</span>}
                  <button
                    type="button"
                    onClick={() => (log ? undoTaken(log.id) : markTaken(slot.med, slot.time))}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      log ? 'bg-mood-accent/10 text-mood-accent' : 'border border-white/10 text-slate-400 hover:border-mood-accent hover:text-mood-accent'
                    }`}
                  >
                    {log ? (
                      <>
                        <Undo2 className="h-3.5 w-3.5" /> Undo
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Mark taken
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        </Card>
      </Section>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit med' : 'Add med'}
      >
        <MedForm
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      <Section title="All meds">
        <Card>
        {medRows.length === 0 ? (
          <EmptyState icon={Pill} title="No meds added yet" />
        ) : (
          <DataGrid
            columns={medColumns}
            data={medRows}
            onEdit={(row) => {
              const med = medById.get(row.id)
              if (med) {
                setEditing(med)
                setFormOpen(true)
              }
            }}
            onDelete={(row) => {
              const med = medById.get(row.id)
              if (med) setDeleteTarget(med)
            }}
          />
        )}
        </Card>
      </Section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete med?"
        message="This can't be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMed(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}

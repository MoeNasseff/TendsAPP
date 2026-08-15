import { useMemo, useState, type FormEvent } from 'react'
import { Gauge, Wrench, Car as CarIcon, ListChecks, Plus } from 'lucide-react'
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
import { formatDate } from '../../lib/format'
import { useCar } from './useCar'
import { ServiceForm } from './ServiceForm'
import { OdometerGauge } from './OdometerGauge'
import type { CarService } from '../../lib/types'

interface ServiceRow {
  id: string
  label: string
  part: string
  remaining: string
}

interface OdometerRow {
  id: string
  reading_km: number
  logged_at: string
}

function remainingFraction(service: CarService, currentKm: number) {
  if (service.interval_km && service.last_service_km != null) {
    const kmRemaining = service.last_service_km + service.interval_km - currentKm
    return kmRemaining / service.interval_km
  }
  if (service.interval_days && service.last_service_date) {
    const daysSince = Math.floor((Date.now() - new Date(service.last_service_date).getTime()) / 86_400_000)
    return (service.interval_days - daysSince) / service.interval_days
  }
  return null
}

function remainingLabel(service: CarService, currentKm: number) {
  if (service.interval_km && service.last_service_km != null) {
    const km = service.last_service_km + service.interval_km - currentKm
    return km <= 0 ? 'Overdue' : `${km.toLocaleString()} km left`
  }
  if (service.interval_days && service.last_service_date) {
    const daysSince = Math.floor((Date.now() - new Date(service.last_service_date).getTime()) / 86_400_000)
    const daysLeft = service.interval_days - daysSince
    return daysLeft <= 0 ? 'Overdue' : `${daysLeft} days left`
  }
  return 'No interval set'
}

export function CarPage() {
  const { car, services, logs, loading, addOdometerReading, addService, updateService, deleteService } = useCar()
  const [editing, setEditing] = useState<CarService | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CarService | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [odometerInput, setOdometerInput] = useState('')
  const [submittingOdometer, setSubmittingOdometer] = useState(false)

  const oilService = useMemo(() => services.find((s) => s.part === 'oil'), [services])
  const otherServices = useMemo(() => services.filter((s) => s.part !== 'oil'), [services])

  const oilKmRemaining = useMemo(() => {
    if (!car || !oilService?.interval_km || oilService.last_service_km == null) return null
    return oilService.last_service_km + oilService.interval_km - car.current_odometer_km
  }, [car, oilService])

  const nextDuePart = useMemo(() => {
    if (!car) return null
    let best: { label: string; fraction: number } | null = null
    for (const s of services) {
      const fraction = remainingFraction(s, car.current_odometer_km)
      if (fraction === null) continue
      if (!best || fraction < best.fraction) {
        best = { label: s.label || s.part, fraction }
      }
    }
    return best?.label ?? 'None'
  }, [services, car])

  async function handleOdometerSubmit(e: FormEvent) {
    e.preventDefault()
    const km = parseInt(odometerInput, 10)
    if (!km || km <= 0) return
    setSubmittingOdometer(true)
    try {
      await addOdometerReading(km)
      setOdometerInput('')
    } finally {
      setSubmittingOdometer(false)
    }
  }

  async function handleServiceSubmit(input: Parameters<typeof addService>[0]) {
    if (editing) {
      await updateService(editing.id, input)
      setEditing(null)
    } else {
      await addService(input)
    }
    setFormOpen(false)
  }

  const serviceRows = useMemo<ServiceRow[]>(
    () =>
      car
        ? otherServices.map((s) => ({
            id: s.id,
            label: s.label || s.part,
            part: s.part,
            remaining: remainingLabel(s, car.current_odometer_km),
          }))
        : [],
    [otherServices, car],
  )

  const serviceColumns = useMemo<DataGridColumn<ServiceRow>[]>(
    () => [
      { data: 'label', title: 'Label' },
      { data: 'part', title: 'Part', format: (v) => String(v).replace('_', ' ') },
      { data: 'remaining', title: 'Status' },
    ],
    [],
  )

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])

  const odometerRows = useMemo<OdometerRow[]>(
    () => logs.map((l) => ({ id: l.id, reading_km: l.reading_km, logged_at: l.logged_at })),
    [logs],
  )

  const odometerColumns = useMemo<DataGridColumn<OdometerRow>[]>(
    () => [
      { data: 'reading_km', title: 'Reading (km)', format: (v) => `${Number(v).toLocaleString()} km` },
      { data: 'logged_at', title: 'Date', format: (v) => formatDate(v as string) },
    ],
    [],
  )

  if (loading) return <PageSkeleton />
  if (!car) return <EmptyState icon={CarIcon} title="No car yet" description="Your car will appear here once seeded." />

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="SERVICE RECORD"
        title="Car"
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            aria-label="Add service"
            className="rounded-lg bg-mood-accent p-2 text-white transition-opacity duration-fast ease-out-expo hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />

      <StatGrid>
        <StatCard label="Km to oil change" value={oilKmRemaining !== null ? oilKmRemaining.toLocaleString() : 'N/A'} icon={Gauge} />
        <StatCard label="Next due part" value={nextDuePart ?? 'None'} icon={Wrench} />
        <StatCard label="Current odometer" value={`${car.current_odometer_km.toLocaleString()} km`} icon={CarIcon} />
        <StatCard label="Services logged" value={logs.length} icon={ListChecks} />
      </StatGrid>

      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
        {oilService && oilService.interval_km ? (
          <OdometerGauge label="Oil change" kmRemaining={oilKmRemaining ?? 0} intervalKm={oilService.interval_km} />
        ) : (
          <EmptyState icon={Gauge} title="No oil service configured" />
        )}
        <form onSubmit={handleOdometerSubmit} className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="odometer-input" className="text-xs text-slate-500">
              New odometer reading (km)
            </label>
            <input
              id="odometer-input"
              type="number"
              placeholder={car.current_odometer_km.toString()}
              value={odometerInput}
              onChange={(e) => setOdometerInput(e.target.value)}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submittingOdometer}
            className="rounded-lg bg-mood-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Log
          </button>
        </form>
      </Card>

      <Section title="Other services">
        <Card>
          {serviceRows.length === 0 ? (
            <EmptyState icon={Wrench} title="No other services yet" />
          ) : (
            <DataGrid
              columns={serviceColumns}
              data={serviceRows}
              onEdit={(row) => {
                const service = serviceById.get(row.id)
                if (service) {
                  setEditing(service)
                  setFormOpen(true)
                }
              }}
              onDelete={(row) => {
                const service = serviceById.get(row.id)
                if (service) setDeleteTarget(service)
              }}
            />
          )}
        </Card>
      </Section>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit service' : 'Add service'}
      >
        <ServiceForm
          editing={editing}
          onSubmit={handleServiceSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      <Section title="Recent odometer logs">
        <Card>
          {odometerRows.length === 0 ? (
            <EmptyState icon={ListChecks} title="No logs yet" />
          ) : (
            <DataGrid columns={odometerColumns} data={odometerRows} />
          )}
        </Card>
      </Section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete service?"
        message="This can't be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteService(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}

import { useMemo, useState, type FormEvent } from 'react'
import { Gauge, Wrench, Car as CarIcon, ListChecks, Trash2, Pencil } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import { GlassCard } from '../../components/GlassCard'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageSkeleton } from '../../components/PageSkeleton'
import { formatDate } from '../../lib/format'
import { useCar } from './useCar'
import { ServiceForm } from './ServiceForm'
import { OdometerGauge } from './OdometerGauge'
import type { CarService } from '../../lib/types'

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
  }

  if (loading) return <PageSkeleton />
  if (!car) return <EmptyState icon={CarIcon} title="No car yet" description="Your car will appear here once seeded." />

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Km to oil change" value={oilKmRemaining !== null ? oilKmRemaining.toLocaleString() : 'N/A'} icon={Gauge} />
        <StatCard label="Next due part" value={nextDuePart ?? 'None'} icon={Wrench} />
        <StatCard label="Current odometer" value={`${car.current_odometer_km.toLocaleString()} km`} icon={CarIcon} />
        <StatCard label="Services logged" value={logs.length} icon={ListChecks} />
      </div>

      <GlassCard className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
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
      </GlassCard>

      <GlassCard>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Other services</h3>
        {otherServices.length === 0 ? (
          <EmptyState icon={Wrench} title="No other services yet" />
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {otherServices.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-100">{s.label || s.part}</p>
                  <p className="text-xs text-slate-500">{remainingLabel(s, car.current_odometer_km)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  aria-label={`Edit ${s.label || s.part}`}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-mood-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(s)}
                  aria-label={`Delete ${s.label || s.part}`}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <ServiceForm editing={editing} onSubmit={handleServiceSubmit} onCancel={() => setEditing(null)} />

      <GlassCard>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Recent odometer logs</h3>
        {logs.length === 0 ? (
          <EmptyState icon={ListChecks} title="No logs yet" />
        ) : (
          <div className="flex flex-col divide-y divide-white/5 text-sm">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2">
                <span className="text-slate-300">{l.reading_km.toLocaleString()} km</span>
                <span className="text-xs text-slate-500">{formatDate(l.logged_at)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

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

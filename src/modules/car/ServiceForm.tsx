import { useEffect, useState, type FormEvent } from 'react'
import { GlassCard } from '../../components/GlassCard'
import { useToast } from '../../hooks/useToast'
import type { CarService, CarServicePart } from '../../lib/types'
import type { CarServiceInput } from './useCar'

const PARTS: CarServicePart[] = [
  'oil',
  'oil_filter',
  'air_filter',
  'brake_pads',
  'tires',
  'coolant',
  'transmission',
  'battery',
  'other',
]

export function ServiceForm({
  editing,
  onSubmit,
  onCancel,
}: {
  editing: CarService | null
  onSubmit: (input: CarServiceInput) => Promise<void>
  onCancel: () => void
}) {
  const showToast = useToast()
  const [part, setPart] = useState<CarServicePart>('other')
  const [label, setLabel] = useState('')
  const [lastServiceKm, setLastServiceKm] = useState('')
  const [lastServiceDate, setLastServiceDate] = useState('')
  const [intervalKm, setIntervalKm] = useState('')
  const [intervalDays, setIntervalDays] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editing) {
      setPart(editing.part)
      setLabel(editing.label ?? '')
      setLastServiceKm(editing.last_service_km?.toString() ?? '')
      setLastServiceDate(editing.last_service_date ?? '')
      setIntervalKm(editing.interval_km?.toString() ?? '')
      setIntervalDays(editing.interval_days?.toString() ?? '')
      setNote(editing.note ?? '')
    } else {
      setPart('other')
      setLabel('')
      setLastServiceKm('')
      setLastServiceDate('')
      setIntervalKm('')
      setIntervalDays('')
      setNote('')
    }
  }, [editing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      showToast('Please enter a label', 'error')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        part,
        label: label.trim(),
        last_service_km: lastServiceKm ? parseInt(lastServiceKm, 10) : null,
        last_service_date: lastServiceDate || null,
        interval_km: intervalKm ? parseInt(intervalKm, 10) : null,
        interval_days: intervalDays ? parseInt(intervalDays, 10) : null,
        note: note.trim(),
      })
      showToast(editing ? 'Service updated' : 'Service added', 'success')
      if (!editing) {
        setLabel('')
        setLastServiceKm('')
        setIntervalKm('')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save service', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select
          value={part}
          aria-label="Part"
          onChange={(e) => setPart(e.target.value as CarServicePart)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        >
          {PARTS.map((p) => (
            <option key={p} value={p}>
              {p.replace('_', ' ')}
            </option>
          ))}
        </select>
        <input
          type="text"
          required
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <input
          type="number"
          placeholder="Last service (km)"
          value={lastServiceKm}
          onChange={(e) => setLastServiceKm(e.target.value)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <input
          type="date"
          placeholder="Last service date"
          value={lastServiceDate}
          onChange={(e) => setLastServiceDate(e.target.value)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <input
          type="number"
          placeholder="Interval (km)"
          value={intervalKm}
          onChange={(e) => setIntervalKm(e.target.value)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <input
          type="number"
          placeholder="Interval (days)"
          value={intervalDays}
          onChange={(e) => setIntervalDays(e.target.value)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <textarea
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none sm:col-span-2"
        />
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-mood-accent py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editing ? 'Update service' : 'Add service'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-white/10 px-4 text-sm text-slate-400 hover:bg-white/5"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </GlassCard>
  )
}

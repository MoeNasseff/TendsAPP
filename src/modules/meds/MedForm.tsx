import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { ImageUpload } from '../../components/ImageUpload'
import { useToast } from '../../hooks/useToast'
import type { Med } from '../../lib/types'
import type { MedInput } from './useMeds'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MedForm({
  editing,
  onSubmit,
  onCancel,
}: {
  editing: Med | null
  onSubmit: (input: MedInput) => Promise<void>
  onCancel: () => void
}) {
  const showToast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dosage, setDosage] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setDescription(editing.description ?? '')
      setDosage(editing.dosage ?? '')
      setImageUrl(editing.image_url)
      setTimes(editing.times_of_day.length ? editing.times_of_day : ['08:00'])
      setDaysOfWeek(editing.days_of_week)
    } else {
      setName('')
      setDescription('')
      setDosage('')
      setImageUrl(null)
      setTimes(['08:00'])
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])
    }
  }, [editing])

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  function updateTime(index: number, value: string) {
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  function addTimeSlot() {
    setTimes((prev) => [...prev, '08:00'])
  }

  function removeTimeSlot(index: number) {
    setTimes((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      showToast('Please enter a med name', 'error')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        dosage: dosage.trim(),
        image_url: imageUrl,
        times_of_day: times,
        days_of_week: daysOfWeek,
      })
      showToast(editing ? 'Med updated' : 'Med added', 'success')
      if (!editing) {
        setName('')
        setDescription('')
        setDosage('')
        setImageUrl(null)
        setTimes(['08:00'])
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save med', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ImageUpload folder="meds" value={imageUrl} onChange={setImageUrl} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label htmlFor="med-name" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Med name</span>
            <input
              id="med-name"
              type="text"
              required
              placeholder="e.g. Ibuprofen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input rounded-lg border px-3 py-2 text-sm outline-hidden"
            />
          </label>
          <label htmlFor="med-dosage" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Dosage</span>
            <input
              id="med-dosage"
              type="text"
              placeholder="e.g. 500mg"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="form-input rounded-lg border px-3 py-2 text-sm outline-hidden"
            />
          </label>
        </div>
        <label htmlFor="med-description" className="flex flex-col gap-1">
          <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Description</span>
          <textarea
            id="med-description"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="form-input rounded-lg border px-3 py-2 text-sm outline-hidden"
          />
        </label>

        <div>
          <p className="mb-1.5 text-micro uppercase text-gray-500 dark:text-gray-400">Times of day</p>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="time"
                  value={t}
                  onChange={(e) => updateTime(i, e.target.value)}
                  className="form-input rounded-lg border px-2 py-1.5 text-sm outline-hidden"
                />
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(i)}
                    aria-label={`Remove time slot ${t}`}
                    className="tap-target text-slate-500 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTimeSlot}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-brand-500 hover:text-brand-500 dark:border-white/15 dark:text-gray-400 dark:hover:border-brand-400 dark:hover:text-brand-400"
            >
              + Time
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-micro uppercase text-gray-500 dark:text-gray-400">Days of week</p>
          <div className="flex gap-1.5">
            {WEEKDAYS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`tap-target h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                  daysOfWeek.includes(i)
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                }`}
              >
                {label[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-white transition-colors duration-fast ease-out-expo hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editing ? 'Update med' : 'Add med'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 text-sm text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
  )
}

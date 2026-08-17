import { useEffect, useState, type FormEvent } from 'react'
import { ImageUpload } from '../../components/ImageUpload'
import { useToast } from '../../hooks/useToast'
import type { DogItem, DogItemKind, ScheduleType } from '../../lib/types'
import type { DogItemInput } from './useDog'

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

export function DogItemForm({
  editing,
  onSubmit,
  onCancel,
}: {
  editing: DogItem | null
  onSubmit: (input: DogItemInput) => Promise<void>
  onCancel: () => void
}) {
  const showToast = useToast()
  const [kind, setKind] = useState<DogItemKind>('vaccine')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [dose, setDose] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('recurring')
  const [dueAt, setDueAt] = useState('')
  const [repeatDays, setRepeatDays] = useState('365')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editing) {
      setKind(editing.kind)
      setName(editing.name)
      setDescription(editing.description ?? '')
      setImageUrl(editing.image_url)
      setDose(editing.dose ?? '')
      setScheduleType(editing.schedule_type)
      setDueAt(toLocalInput(editing.due_at))
      setRepeatDays(editing.repeat_interval_days?.toString() ?? '365')
    } else {
      setKind('vaccine')
      setName('')
      setDescription('')
      setImageUrl(null)
      setDose('')
      setScheduleType('recurring')
      setDueAt('')
      setRepeatDays('365')
    }
  }, [editing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      showToast('Please enter a name', 'error')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        kind,
        name: name.trim(),
        description: description.trim(),
        image_url: imageUrl,
        dose: dose.trim(),
        schedule_type: scheduleType,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        repeat_interval_days: scheduleType === 'recurring' ? parseInt(repeatDays, 10) || null : null,
      })
      showToast(editing ? 'Item updated' : 'Item added', 'success')
      if (!editing) {
        setName('')
        setDescription('')
        setImageUrl(null)
        setDose('')
        setDueAt('')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save item', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ImageUpload folder="dog" value={imageUrl} onChange={setImageUrl} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label htmlFor="dogitem-kind" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Kind</span>
            <select
              id="dogitem-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as DogItemKind)}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
            >
              <option value="vaccine">Vaccine</option>
              <option value="medicine">Medicine</option>
            </select>
          </label>
          <label htmlFor="dogitem-name" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Name</span>
            <input
              id="dogitem-name"
              type="text"
              required
              placeholder="e.g. Rabies vaccine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
            />
          </label>
        </div>
        <label htmlFor="dogitem-description" className="flex flex-col gap-1">
          <span className="text-micro uppercase text-white/50">Description</span>
          <textarea
            id="dogitem-description"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
          />
        </label>
        <label htmlFor="dogitem-dose" className="flex flex-col gap-1">
          <span className="text-micro uppercase text-white/50">Dose</span>
          <input
            id="dogitem-dose"
            type="text"
            placeholder="Optional"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label htmlFor="dogitem-schedule-type" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Schedule type</span>
            <select
              id="dogitem-schedule-type"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
            >
              <option value="once">Once</option>
              <option value="recurring">Recurring</option>
            </select>
          </label>
          <label htmlFor="dogitem-due-at" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Due</span>
            <input
              id="dogitem-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
            />
          </label>
          {scheduleType === 'recurring' && (
            <label htmlFor="dogitem-repeat-days" className="flex flex-col gap-1">
              <span className="text-micro uppercase text-white/50">Repeat every (days)</span>
              <input
                id="dogitem-repeat-days"
                type="number"
                value={repeatDays}
                onChange={(e) => setRepeatDays(e.target.value)}
                className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
              />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-mood-accent py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editing ? 'Update item' : 'Add item'}
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
  )
}

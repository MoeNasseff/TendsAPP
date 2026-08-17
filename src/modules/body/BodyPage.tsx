import { useMemo, useState } from 'react'
import { Save, Scale, Ruler, Cake, Activity } from 'lucide-react'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { StatGrid } from '../../components/StatGrid'
import { Section } from '../../components/Section'
import { PageSkeleton } from '../../components/PageSkeleton'
import { StatCard } from '../../components/StatCard'
import {
  ageFrom,
  bmiBand,
  calcBmi,
  lengthUnit,
  toDisplayLength,
  toDisplayWeight,
  toStoredLength,
  toStoredWeight,
  weightUnit,
} from '../../lib/format'
import type { MeasurementSite, Sex, UnitSystem } from '../../lib/types'
import { BodyFigure } from './BodyFigure'
import { MeasurementHistory } from './MeasurementHistory'
import { sitesFor } from './measurementSites'
import { useBody } from './useBody'

export function BodyPage() {
  const { profile, history, loading, latest, saveProfile, addMeasurement } = useBody()

  const [draft, setDraft] = useState<Partial<Record<MeasurementSite, string>>>({})
  const [weight, setWeight] = useState('')
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const unit = profile.unit_system
  const len = lengthUnit(unit)
  const wt = weightUnit(unit)

  const age = ageFrom(profile.birth_date)
  const latestWeightKg = latest?.weight_kg ?? null
  const bmi = useMemo(
    () =>
      latestWeightKg && profile.height_cm ? calcBmi(latestWeightKg, profile.height_cm) : null,
    [latestWeightKg, profile.height_cm],
  )

  if (loading) return <PageSkeleton />

  // Sex decides which figure is drawn and which sites exist, so it is asked
  // before anything else can be shown. Stored on the profile and changeable
  // later from the vitals card, not frozen at first answer.
  if (!profile.sex) return <SexGate onPick={(sex) => saveProfile({ sex })} />

  async function handleSave() {
    const sites = sitesFor(profile.sex as Sex)
    const values: Partial<Record<MeasurementSite, number | null>> = {}
    for (const site of sites) {
      const raw = draft[site.key]
      const parsed = raw ? Number(raw) : NaN
      // Converted back to canonical cm on the way in, so history stays
      // comparable regardless of which unit it was typed in.
      values[site.key] = Number.isFinite(parsed) ? Number(toStoredLength(parsed, unit).toFixed(1)) : null
    }

    const parsedWeight = weight ? Number(weight) : NaN
    setSaving(true)
    const ok = await addMeasurement({
      ...values,
      taken_at: takenAt,
      weight_kg: Number.isFinite(parsedWeight)
        ? Number(toStoredWeight(parsedWeight, unit).toFixed(2))
        : null,
      note: null,
    })
    setSaving(false)
    if (ok) {
      setDraft({})
      setWeight('')
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="COMPOSITION" title="Body" />

      <StatGrid>
        <StatCard
          icon={Scale}
          label="Weight"
          value={latestWeightKg ? `${toDisplayWeight(latestWeightKg, unit).toFixed(1)} ${wt}` : '—'}
          sensitive
        />
        <StatCard
          icon={Ruler}
          label="Height"
          value={profile.height_cm ? `${toDisplayLength(profile.height_cm, unit).toFixed(1)} ${len}` : '—'}
          sensitive
        />
        <StatCard icon={Cake} label="Age" value={age !== null ? `${age}` : '—'} />
        {/* Band folded into the value rather than adding a prop to the shared
            StatCard, which every other module also renders. */}
        <StatCard
          icon={Activity}
          label="BMI"
          value={bmi ? `${bmi.toFixed(1)} · ${bmiBand(bmi).label}` : '—'}
          sensitive
        />
      </StatGrid>

      <Section
        title="Measurements"
        action={<UnitToggle value={unit} onChange={(unit_system) => saveProfile({ unit_system })} />}
      >
        <Card>
        <BodyFigure
          sex={profile.sex}
          values={draft}
          unit={len}
          onChange={(site, value) => setDraft((d) => ({ ...d, [site]: value }))}
        />

        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-white/5 pt-4">
          <label htmlFor="body-weight" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Weight ({wt})</span>
            <input
              id="body-weight"
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="form-input w-24 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-200 outline-hidden"
            />
          </label>
          <label htmlFor="body-taken-at" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Date</span>
            <input
              id="body-taken-at"
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-200 outline-hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ml-auto flex items-center gap-2 rounded-lg bg-mood-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save session'}
          </button>
        </div>
        </Card>
      </Section>

      <Section title="About you">
        <Card>
        <div className="flex flex-wrap gap-3">
          <label htmlFor="body-height" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Height ({len})</span>
            <input
              id="body-height"
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              defaultValue={profile.height_cm ? toDisplayLength(profile.height_cm, unit).toFixed(1) : ''}
              onBlur={(e) => {
                const v = Number(e.target.value)
                saveProfile({
                  height_cm: Number.isFinite(v) && v > 0 ? Number(toStoredLength(v, unit).toFixed(1)) : null,
                })
              }}
              className="form-input w-28 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-200 outline-hidden"
            />
          </label>
          <label htmlFor="body-birth-date" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Date of birth</span>
            <input
              id="body-birth-date"
              type="date"
              defaultValue={profile.birth_date ?? ''}
              onBlur={(e) => saveProfile({ birth_date: e.target.value || null })}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-200 outline-hidden"
            />
          </label>
          <label htmlFor="body-sex" className="flex flex-col gap-1">
            <span className="text-micro uppercase text-white/50">Figure</span>
            <select
              id="body-sex"
              value={profile.sex}
              onChange={(e) => saveProfile({ sex: e.target.value as Sex })}
              className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-200 outline-hidden"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
        </div>
        </Card>
      </Section>

      <Section title="History">
        <Card>
        <MeasurementHistory history={history} sex={profile.sex} unit={unit} />
        </Card>
      </Section>
    </div>
  )
}

function UnitToggle({
  value,
  onChange,
}: {
  value: UnitSystem
  onChange: (value: UnitSystem) => void
}) {
  return (
    <div className="flex rounded-xl border border-white/5 bg-black/20 p-1 text-xs">
      {(['metric', 'imperial'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-lg px-3 py-1 font-medium transition-colors ${
            value === option ? 'bg-mood-accent text-white' : 'text-slate-400'
          }`}
        >
          {option === 'metric' ? 'cm / kg' : 'in / lb'}
        </button>
      ))}
    </div>
  )
}

function SexGate({ onPick }: { onPick: (sex: Sex) => void }) {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <Card>
        <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
          <h2 className="text-base font-semibold text-slate-100">Which figure should we use?</h2>
          <p className="max-w-xs text-sm text-slate-400">
            This sets the outline and which measurements are shown. You can change it later.
          </p>
          <div className="mt-2 flex gap-3">
            {(['female', 'male'] as const).map((sex) => (
              <button
                key={sex}
                type="button"
                onClick={() => onPick(sex)}
                className="min-w-28 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium capitalize text-slate-200 transition-colors hover:border-mood-accent hover:text-mood-accent"
              >
                {sex}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

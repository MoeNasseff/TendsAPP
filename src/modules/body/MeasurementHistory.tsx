import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { LineChart as LineChartIcon } from 'lucide-react'
import { formatDate, lengthUnit, toDisplayLength, type UnitSystemName } from '../../lib/format'
import { CHART_SERIES, tooltipProps, axisProps, gridProps } from '../../lib/chartTheme'
import type { BodyMeasurement, MeasurementSite, Sex } from '../../lib/types'
import { sitesFor } from './measurementSites'

interface Props {
  history: BodyMeasurement[]
  sex: Sex
  unit: UnitSystemName
}

/**
 * Measurement history over time, with the sites to plot chosen by the user.
 *
 * Defaults to waist because it is the single most responsive site to changes in
 * body composition, so it is the most useful line to see first.
 */
export function MeasurementHistory({ history, sex, unit }: Props) {
  const available = sitesFor(sex)
  const [selected, setSelected] = useState<MeasurementSite[]>(['waist'])

  const data = useMemo(
    () =>
      history.map((row) => {
        const point: Record<string, number | string | null> = {
          date: formatDate(row.taken_at),
        }
        for (const site of available) {
          const raw = row[site.key]
          // Converted at plot time, not at save time, so the same rows redraw
          // correctly the moment the unit toggle changes.
          point[site.key] = raw === null ? null : Number(toDisplayLength(raw, unit).toFixed(1))
        }
        return point
      }),
    [history, available, unit],
  )

  if (history.length === 0) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="No history yet"
        description="Save a second set of measurements to start seeing trends."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {available.map((site) => {
          const active = selected.includes(site.key)
          return (
            <button
              key={site.key}
              type="button"
              onClick={() =>
                setSelected((current) =>
                  active ? current.filter((s) => s !== site.key) : [...current, site.key],
                )
              }
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-mood-accent text-white'
                  : 'border border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {site.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.map((site) => (
          <TrendBadge
            key={site}
            label={available.find((s) => s.key === site)?.label ?? site}
            history={history}
            site={site}
            unit={unit}
          />
        ))}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis
              {...axisProps}
              domain={['dataMin - 3', 'dataMax + 3']}
              unit={` ${lengthUnit(unit)}`}
              width={64}
            />
            <Tooltip {...tooltipProps} formatter={(value) => `${value} ${lengthUnit(unit)}`} />
            {selected.map((site, i) => (
              <Line
                key={site}
                type="monotone"
                dataKey={site}
                name={available.find((s) => s.key === site)?.label ?? site}
                stroke={CHART_SERIES[i % CHART_SERIES.length]}
                strokeWidth={2}
                dot={false}
                // Gaps rather than false straight lines where a site was
                // skipped in a session.
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * Direction of travel for one site, comparing its first and last recorded
 * values. Sessions where the site was skipped are ignored, so a partial entry
 * cannot masquerade as a change.
 */
function TrendBadge({
  label,
  history,
  site,
  unit,
}: {
  label: string
  history: BodyMeasurement[]
  site: MeasurementSite
  unit: UnitSystemName
}) {
  const points = history.map((h) => h[site]).filter((v): v is number => v !== null)
  if (points.length < 2) {
    return (
      <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-500">
        {label}: needs 2 readings
      </span>
    )
  }

  const deltaCm = points[points.length - 1] - points[0]
  const delta = toDisplayLength(Math.abs(deltaCm), unit)
  const flat = Math.abs(deltaCm) < 0.5

  const Icon = flat ? Minus : deltaCm < 0 ? TrendingDown : TrendingUp
  const tone = flat ? 'text-slate-400' : deltaCm < 0 ? 'text-emerald-400' : 'text-amber-400'
  const word = flat ? 'no change' : deltaCm < 0 ? 'slimmer' : 'larger'

  return (
    <span
      className={`flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}: {flat ? word : `${delta.toFixed(1)} ${lengthUnit(unit)} ${word}`}
    </span>
  )
}

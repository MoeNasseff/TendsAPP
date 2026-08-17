import type { MeasurementSite, Sex } from '../../lib/types'
import { VIEWBOX, sitesFor, type SiteDef } from './measurementSites'

/**
 * Figure proportions, in viewBox units either side of the centre line.
 *
 * The two figures differ by these numbers rather than by separately drawn art,
 * which is what keeps them symmetrical and keeps every limb ending exactly
 * where its measurement anchor expects it. Hand-authored paths drifted: an
 * earlier pair had arms stopping at the waist, leaving the forearm and wrist
 * leader lines pointing at empty space.
 */
const PROPORTIONS: Record<Sex, { shoulder: number; waist: number; hip: number }> = {
  male: { shoulder: 40, waist: 29, hip: 33 },
  female: { shoulder: 32, waist: 22, hip: 39 },
}

const CENTRE = 100

/**
 * Torso as a closed outline: across the shoulders, in to the waist, out to the
 * hips. Mirrored around the centre line so it cannot come out lopsided.
 */
function torsoPath(sex: Sex) {
  const { shoulder: s, waist: w, hip: h } = PROPORTIONS[sex]
  return [
    `M ${CENTRE - s} 80`,
    // shoulder down to waist
    `C ${CENTRE - s} 112, ${CENTRE - w - 4} 128, ${CENTRE - w} 152`,
    // waist out to hip
    `C ${CENTRE - h + 2} 172, ${CENTRE - h} 186, ${CENTRE - h} 202`,
    `L ${CENTRE + h} 202`,
    `C ${CENTRE + h} 186, ${CENTRE + h - 2} 172, ${CENTRE + w} 152`,
    `C ${CENTRE + w + 4} 128, ${CENTRE + s} 112, ${CENTRE + s} 80`,
    // back across the shoulders, dipping slightly at the neck
    `C ${CENTRE + s - 8} 72, ${CENTRE + 10} 68, ${CENTRE} 68`,
    `C ${CENTRE - 10} 68, ${CENTRE - s + 8} 72, ${CENTRE - s} 80`,
    'Z',
  ].join(' ')
}

/**
 * Arms and legs are strokes with round caps rather than filled outlines. It is
 * far easier to guarantee a limb spans an exact vertical range that way, and
 * the anchors depend on it: wrist sits at y=186, so the arm must reach y=190.
 */
function limbPaths(sex: Sex) {
  const { shoulder: s, hip: h } = PROPORTIONS[sex]
  const armTop = 84
  const armEnd = 190
  const legTop = 206
  const legEnd = 392

  const arm = (dir: 1 | -1) =>
    `M ${CENTRE + dir * (s - 4)} ${armTop}` +
    ` C ${CENTRE + dir * (s + 5)} 120, ${CENTRE + dir * (s + 4)} 158, ${CENTRE + dir * (s + 1)} ${armEnd}`

  const leg = (dir: 1 | -1) =>
    `M ${CENTRE + dir * (h - 12)} ${legTop}` +
    ` C ${CENTRE + dir * (h - 10)} 270, ${CENTRE + dir * (h - 14)} 330, ${CENTRE + dir * (h - 16)} ${legEnd}`

  return { arms: [arm(-1), arm(1)], legs: [leg(-1), leg(1)] }
}

/**
 * Where a leader line touches the body.
 *
 * Torso sites sit on the centre line and use their authored x. Limb sites
 * cannot: the arms hang at shoulder width and the legs at hip width, both of
 * which differ between the figures, so a fixed x would miss the limb on one of
 * them. These are derived from the same proportions that draw the limb.
 */
function anchorX(site: SiteDef, sex: Sex): number {
  const { shoulder: s, hip: h } = PROPORTIONS[sex]
  switch (site.key) {
    case 'upper_arm':
      return CENTRE - (s + 4)
    case 'forearm':
      return CENTRE - (s + 3)
    case 'wrist':
      return CENTRE - (s + 1)
    case 'thigh':
      return CENTRE + (h - 11)
    case 'calf':
      return CENTRE - (h - 13)
    default:
      return site.x
  }
}

interface BodyFigureProps {
  sex: Sex
  /** Current values in the active display unit, keyed by site. */
  values: Partial<Record<MeasurementSite, string>>
  onChange: (site: MeasurementSite, value: string) => void
  unit: string
}

export function BodyFigure({ sex, values, onChange, unit }: BodyFigureProps) {
  const sites = sitesFor(sex)
  const limbs = limbPaths(sex)
  const left = sites.filter((s) => s.side === 'left')
  const right = sites.filter((s) => s.side === 'right')

  return (
    <div className="flex items-start justify-center gap-1 sm:gap-3">
      <SiteColumn sites={left} side="left" values={values} onChange={onChange} unit={unit} />

      <div className="relative w-[38%] max-w-[220px] shrink-0">
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${sex} body outline with measurement points`}
        >
          <g className="fill-mood-accent/15 stroke-mood-accent">
            <circle cx={CENTRE} cy={44} r={17} strokeWidth={2} />
            <path d={torsoPath(sex)} strokeWidth={2} strokeLinejoin="round" />
            {[...limbs.arms, ...limbs.legs].map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                strokeWidth={i < 2 ? 13 : 18}
                strokeLinecap="round"
                // Limbs are drawn as thick strokes, so the accent stroke colour
                // would swallow them. Painted in the fill tint instead, with a
                // thin outline over the top for the same edge as the torso.
                className="stroke-mood-accent/25"
              />
            ))}
            {[...limbs.arms, ...limbs.legs].map((d, i) => (
              <path key={`o${i}`} d={d} fill="none" strokeWidth={1.5} strokeLinecap="round" />
            ))}
          </g>
          {sites.map((site) => (
            <Leader
              key={site.key}
              site={site}
              x={anchorX(site, sex)}
              filled={Boolean(values[site.key])}
            />
          ))}
        </svg>
      </div>

      <SiteColumn sites={right} side="right" values={values} onChange={onChange} unit={unit} />
    </div>
  )
}

/**
 * The line from a point on the body out to the edge, plus a dot at the point
 * itself. Filled sites are drawn solid so it is obvious at a glance which
 * measurements have been entered.
 */
function Leader({ site, x, filled }: { site: SiteDef; x: number; filled: boolean }) {
  const edge = site.side === 'left' ? 0 : VIEWBOX.width
  return (
    <g className={filled ? 'text-mood-accent' : 'text-slate-600'}>
      <line
        x1={x}
        y1={site.y}
        x2={edge}
        y2={site.y}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray={filled ? undefined : '3 3'}
      />
      <circle cx={x} cy={site.y} r={3.5} fill="currentColor" />
    </g>
  )
}

/**
 * A column of inputs positioned to line up with their anchors.
 *
 * Each box is placed by percentage of the figure's height, taken from the same
 * anchor the leader line uses, so the two cannot drift apart — no DOM
 * measurement and no recalculation on resize.
 */
function SiteColumn({
  sites,
  side,
  values,
  onChange,
  unit,
}: {
  sites: SiteDef[]
  side: 'left' | 'right'
  values: Partial<Record<MeasurementSite, string>>
  onChange: (site: MeasurementSite, value: string) => void
  unit: string
}) {
  return (
    <div className="relative min-w-0 flex-1" style={{ aspectRatio: `1 / ${VIEWBOX.height / 200}` }}>
      {sites.map((site) => (
        <div
          key={site.key}
          className="absolute w-full -translate-y-1/2"
          style={{ top: `${(site.y / VIEWBOX.height) * 100}%` }}
        >
          <label
            className={`flex flex-col gap-0.5 ${side === 'left' ? 'items-end text-right' : 'items-start text-left'}`}
          >
            <span className="text-[10px] font-medium text-slate-400" title={site.hint}>
              {site.label}
            </span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={values[site.key] ?? ''}
                onChange={(e) => onChange(site.key, e.target.value)}
                placeholder="—"
                aria-label={`${site.label} in ${unit}`}
                className="form-input w-14 rounded-lg border border-white/10 bg-black/20 px-1.5 py-1 text-center text-xs text-slate-200 outline-hidden focus:border-mood-accent sm:w-16"
              />
              <span className="text-[10px] text-slate-600">{unit}</span>
            </span>
          </label>
        </div>
      ))}
    </div>
  )
}

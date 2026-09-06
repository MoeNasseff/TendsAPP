import { CREDIT_UTILISATION_THRESHOLDS, meterTone, type MeterThresholds } from '../lib/meter'

/**
 * The thin track-and-fill meter with a readout beside it.
 *
 * Extracted from `AccountsPage` (S32c), which built it inline, so that the
 * budgets page (S34a) shares it rather than growing a second one. Two bars
 * meant to look identical and maintained separately do not stay identical.
 *
 * **Thresholds are a prop, not a constant, and that is the point.** S32c's
 * numbers are credit-utilisation advice figures; a budget means something
 * different at the same percentage. Sharing the markup while sharing those
 * thresholds would paint every budget amber for three weeks a month and teach
 * the user that the colour carries no information. See `lib/meter.ts` for the
 * two sets and why they differ.
 *
 * The default reproduces S32c's behaviour exactly, which is what let
 * AccountsPage adopt this with no visual change at all.
 */
export function ProgressMeter({
  percent,
  thresholds = CREDIT_UTILISATION_THRESHOLDS,
  label,
}: {
  percent: number
  thresholds?: MeterThresholds
  /** Overrides the "NN%" readout — budgets show "over" past 100, not "137%". */
  label?: string
}) {
  // The fill is clamped but the *number* is not: a budget at 137% must be able
  // to say so. Clamping the readout too would hide the case worth seeing.
  const width = Math.min(100, Math.max(0, percent))

  return (
    <div className="flex w-full max-w-[140px] shrink-0 items-center gap-3">
      <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
        <div
          className={`absolute top-0 left-0 h-full rounded-sm ${meterTone(percent, thresholds)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="w-10 shrink-0 text-right font-medium text-gray-800 text-theme-sm dark:text-white/90">
        {label ?? `${percent.toFixed(0)}%`}
      </p>
    </div>
  )
}

/**
 * Threshold values and tone logic for `ProgressMeter`.
 *
 * Split out of the component file for the same reason `providers.ts` and
 * `ProviderMark.tsx` are separate: a module that exports both components and
 * plain values breaks Fast Refresh, and the lint rule that catches it is on.
 */

export interface MeterThresholds {
  /** At or above this percent the fill turns amber. */
  warn: number
  /** At or above this percent it turns red. Must be >= warn. */
  danger: number
}

/**
 * S32c's original figures — credit utilisation, where carrying a third of your
 * limit is already worth flagging. This is the default so that adopting the
 * shared meter changed nothing about how the accounts page looks.
 */
export const CREDIT_UTILISATION_THRESHOLDS: MeterThresholds = { warn: 30, danger: 70 }

/**
 * Budgets mean the opposite thing at the same number: being 30% through your
 * grocery budget is simply what the 10th of the month looks like. Amber once
 * most of the allowance is gone, red only once it is actually exceeded — 100
 * rather than 90, because "over budget" is a fact the user can act on where
 * "nearly over" is a judgement call.
 */
export const BUDGET_THRESHOLDS: MeterThresholds = { warn: 80, danger: 100 }

export function meterTone(percent: number, { warn, danger }: MeterThresholds): string {
  if (percent >= danger) return 'bg-error-500'
  if (percent >= warn) return 'bg-warning-500'
  return 'bg-success-500'
}

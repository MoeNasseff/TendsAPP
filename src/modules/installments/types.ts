import type { AnalyticsResult } from '../analytics/types'
import type { PaymentMethod } from '../../lib/types'

export type { AnalyticsResult }

/**
 * Installment exposure for one funding source.
 *
 * `installmentUtilisation` is deliberately not called "utilisation". It is
 * derived only from outstanding installment plans recorded in this app — Tend
 * has no bank feed, so it is not a live card balance and must never be
 * presented as one. A card carrying charges entered nowhere in Tend will read
 * as 0% used and that reading is correct for what this number means.
 */
export interface MethodExposure {
  method: PaymentMethod
  outstanding: number
  activePlans: number
  /** Percentage 0-100, or null when the method has no recorded credit_limit. */
  installmentUtilisation: number | null
  /** credit_limit − outstanding, or null when no limit is recorded. */
  availableCredit: number | null
  /** Sum of monthly_amount across this method's active plans. */
  monthlyBurden: number
}

export interface PlanProgress {
  planId: string
  description: string
  methodLabel: string
  monthlyAmount: number
  totalPayable: number
  paidAmount: number
  paidCount: number
  months: number
  /** 0-100, by amount rather than by instalment count. */
  percentPaid: number
  outstanding: number
  nextDueOn: string | null
  isLate: boolean
}

export interface UpcomingDue {
  paymentId: string
  planId: string
  description: string
  methodLabel: string
  providerSlug: string | null
  dueOn: string
  amount: number
  isLate: boolean
}

export interface InstallmentSummary {
  /** Across every active plan, regardless of method. */
  totalOutstanding: number
  /** What falls due in the current calendar month. */
  monthlyBurden: number
  activePlans: number
  lateCount: number
}

/**
 * `schema_missing` is a fourth state alongside loading/ok/error: the migration
 * that creates these tables has been written but not pushed. It is a normal,
 * expected condition rather than a failure, and the UI says so plainly instead
 * of showing an error or a misleading set of zeroes.
 */
export type InstallmentsAvailability = 'ready' | 'schema_missing'

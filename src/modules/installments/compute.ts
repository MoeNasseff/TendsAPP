import type { InstallmentPayment, InstallmentPlan, PaymentMethod } from '../../lib/types'
import type { AnalyticsResult } from '../analytics/types'
import type { InstallmentSummary, MethodExposure, PlanProgress, UpcomingDue } from './types'

/**
 * Pure functions over installment rows. Same contract as the analytics engine:
 * no Supabase access here, and an unknowable metric returns
 * `insufficient_data` rather than a zero that reads like a fact.
 */

const UNPAID: ReadonlySet<string> = new Set(['scheduled', 'late'])

function isUnpaid(payment: InstallmentPayment): boolean {
  return UNPAID.has(payment.status)
}

function todayISO(reference: Date): string {
  const y = reference.getFullYear()
  const m = String(reference.getMonth() + 1).padStart(2, '0')
  const d = String(reference.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function paymentsByPlan(payments: InstallmentPayment[]): Map<string, InstallmentPayment[]> {
  const map = new Map<string, InstallmentPayment[]>()
  for (const p of payments) {
    const list = map.get(p.plan_id) ?? []
    list.push(p)
    map.set(p.plan_id, list)
  }
  for (const list of map.values()) list.sort((a, b) => a.seq - b.seq)
  return map
}

/** Outstanding for one plan: the unpaid instalments only. Falls back to the
 *  plan's own total when its schedule was never generated, so a plan with no
 *  rows still reports a real liability instead of zero. */
function planOutstanding(plan: InstallmentPlan, payments: InstallmentPayment[] | undefined): number {
  if (!payments || payments.length === 0) {
    return plan.status === 'completed' || plan.status === 'cancelled' ? 0 : Number(plan.total_payable)
  }
  return payments.filter(isUnpaid).reduce((s, p) => s + Number(p.amount), 0)
}

export function computeMethodExposures(
  methods: PaymentMethod[],
  plans: InstallmentPlan[],
  payments: InstallmentPayment[],
): AnalyticsResult<{ exposures: MethodExposure[] }> {
  if (methods.length === 0) {
    return { status: 'insufficient_data', reason: 'no payment methods recorded yet' }
  }

  const byPlan = paymentsByPlan(payments)
  const activePlans = plans.filter((p) => p.status === 'active' || p.status === 'late')

  const exposures: MethodExposure[] = methods.map((method) => {
    const mine = activePlans.filter((p) => p.payment_method_id === method.id)
    const outstanding = mine.reduce((s, p) => s + planOutstanding(p, byPlan.get(p.id)), 0)
    const limit = method.credit_limit === null ? null : Number(method.credit_limit)

    return {
      method,
      outstanding,
      activePlans: mine.length,
      // Null limit means "not recorded", so utilisation is unknowable. Zero
      // here would read as "nothing used", which is a different claim.
      installmentUtilisation: limit === null || limit === 0 ? null : (outstanding / limit) * 100,
      availableCredit: limit === null ? null : limit - outstanding,
      monthlyBurden: mine.reduce((s, p) => s + Number(p.monthly_amount), 0),
    }
  })

  exposures.sort((a, b) => b.outstanding - a.outstanding)
  return { status: 'ok', exposures }
}

export function computePlanProgress(
  plans: InstallmentPlan[],
  payments: InstallmentPayment[],
  methods: PaymentMethod[],
  reference: Date = new Date(),
): AnalyticsResult<{ progress: PlanProgress[] }> {
  if (plans.length === 0) return { status: 'insufficient_data', reason: 'no installment plans recorded yet' }

  const byPlan = paymentsByPlan(payments)
  const methodById = new Map(methods.map((m) => [m.id, m]))
  const today = todayISO(reference)

  const progress: PlanProgress[] = plans.map((plan) => {
    const rows = byPlan.get(plan.id) ?? []
    const paid = rows.filter((p) => p.status === 'paid')
    const paidAmount = paid.reduce((s, p) => s + Number(p.paid_amount ?? p.amount), 0)
    const total = Number(plan.total_payable)
    const next = rows.find(isUnpaid) ?? null

    return {
      planId: plan.id,
      description: plan.description,
      methodLabel: methodById.get(plan.payment_method_id)?.label ?? 'Unknown',
      monthlyAmount: Number(plan.monthly_amount),
      totalPayable: total,
      paidAmount,
      paidCount: paid.length,
      months: plan.months,
      percentPaid: total === 0 ? 0 : (paidAmount / total) * 100,
      outstanding: planOutstanding(plan, rows),
      nextDueOn: next?.due_on ?? null,
      isLate: rows.some((p) => isUnpaid(p) && p.due_on < today),
    }
  })

  progress.sort((a, b) => {
    if (a.isLate !== b.isLate) return a.isLate ? -1 : 1
    return (a.nextDueOn ?? '9999').localeCompare(b.nextDueOn ?? '9999')
  })
  return { status: 'ok', progress }
}

export function computeUpcomingDues(
  plans: InstallmentPlan[],
  payments: InstallmentPayment[],
  methods: PaymentMethod[],
  reference: Date = new Date(),
  withinDays = 30,
): AnalyticsResult<{ dues: UpcomingDue[] }> {
  if (payments.length === 0) return { status: 'insufficient_data', reason: 'no installment schedule recorded yet' }

  const planById = new Map(plans.map((p) => [p.id, p]))
  const methodById = new Map(methods.map((m) => [m.id, m]))
  const today = todayISO(reference)
  const horizon = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + withinDays)
  const horizonISO = todayISO(horizon)

  const dues: UpcomingDue[] = payments
    // Anything already overdue stays visible however old it is — dropping it
    // once it ages past the window would quietly hide the worst case.
    .filter((p) => isUnpaid(p) && p.due_on <= horizonISO)
    .map((payment) => {
      const plan = planById.get(payment.plan_id)
      const method = plan ? methodById.get(plan.payment_method_id) : undefined
      return {
        paymentId: payment.id,
        planId: payment.plan_id,
        description: plan?.description ?? 'Unknown plan',
        methodLabel: method?.label ?? 'Unknown',
        providerSlug: method?.provider_slug ?? null,
        dueOn: payment.due_on,
        amount: Number(payment.amount),
        isLate: payment.due_on < today,
      }
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))

  return { status: 'ok', dues }
}

export function computeInstallmentSummary(
  plans: InstallmentPlan[],
  payments: InstallmentPayment[],
  reference: Date = new Date(),
): AnalyticsResult<InstallmentSummary> {
  const active = plans.filter((p) => p.status === 'active' || p.status === 'late')
  if (active.length === 0) return { status: 'insufficient_data', reason: 'no active installment plans' }

  const byPlan = paymentsByPlan(payments)
  const today = todayISO(reference)
  const monthPrefix = today.slice(0, 7)

  return {
    status: 'ok',
    totalOutstanding: active.reduce((s, p) => s + planOutstanding(p, byPlan.get(p.id)), 0),
    monthlyBurden: payments
      .filter((p) => isUnpaid(p) && p.due_on.startsWith(monthPrefix))
      .reduce((s, p) => s + Number(p.amount), 0),
    activePlans: active.length,
    lateCount: payments.filter((p) => isUnpaid(p) && p.due_on < today).length,
  }
}

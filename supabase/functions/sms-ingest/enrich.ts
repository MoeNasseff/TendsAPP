// Merchant/category/payment-method matching and instalment-plan linking for
// a parsed sms_inbox row -- deterministic or AI, the contract is the same.
//
// Nothing here ever creates a merchant, a category, or an instalment plan.
// A new merchant is created on Accept, by the user's own action in the
// ExpenseForm flow, never by a background parser. An instalment notice links
// to an existing installment_plans row where one plausibly matches; it never
// creates one -- a liability appearing in the app on the strength of a text
// message is not an acceptable outcome of an unattended SMS pipeline.
//
// Logos stay monogram-based (src/modules/installments/providers.ts). This
// file never fetches or stores a third-party merchant logo.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface Enrichment {
  merchantId: string | null
  categoryId: string | null
  paymentMethodId: string | null
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Case-insensitive exact match on `normalized_name`, the same key
 * `save_receipt` matches merchants by. A merchant the parser has never seen
 * exactly is left unmatched rather than fuzzy-matched -- a wrong merchant
 * match mislabels a real transaction, which is worse than an empty field the
 * user fills in on Accept.
 *
 * Category comes from the most recent expense on record for that same
 * merchant -- "what did I file this under last time", the same signal a
 * human reviewer would use, not a guess.
 */
export async function enrich(
  admin: SupabaseClient,
  userId: string,
  fields: { merchantRaw: string | null; last4: string | null },
): Promise<Enrichment> {
  let merchantId: string | null = null
  let categoryId: string | null = null
  let paymentMethodId: string | null = null

  if (fields.merchantRaw) {
    const { data: merchant } = await admin
      .from('merchants')
      .select('id')
      .eq('user_id', userId)
      .eq('normalized_name', normalizeName(fields.merchantRaw))
      .maybeSingle()
    merchantId = merchant?.id ?? null

    if (merchantId) {
      const { data: recentReceipt } = await admin
        .from('receipts')
        .select('expense_id')
        .eq('user_id', userId)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentReceipt?.expense_id) {
        const { data: expense } = await admin
          .from('expenses')
          .select('category_id')
          .eq('id', recentReceipt.expense_id)
          .maybeSingle()
        categoryId = expense?.category_id ?? null
      }
    }
  }

  if (fields.last4) {
    const { data: method } = await admin
      .from('payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('last4', fields.last4)
      .eq('active', true)
      .maybeSingle()
    paymentMethodId = method?.id ?? null
  }

  return { merchantId, categoryId, paymentMethodId }
}

/**
 * Links to an active plan on the same payment method whose monthly_amount is
 * within a small tolerance of what the text reports -- a tolerance, not an
 * equality check, because a schedule's rounding remainder lands entirely on
 * its final instalment (see generate_installment_schedule), so the last
 * payment's amount legitimately differs from every other one.
 */
export async function matchInstallmentPlan(
  admin: SupabaseClient,
  userId: string,
  paymentMethodId: string | null,
  amount: number | null,
): Promise<string | null> {
  if (!paymentMethodId || amount === null) return null

  const { data: plans } = await admin
    .from('installment_plans')
    .select('id, monthly_amount')
    .eq('user_id', userId)
    .eq('payment_method_id', paymentMethodId)
    .in('status', ['active', 'late'])

  const match = (plans ?? []).find((p) => Math.abs(Number(p.monthly_amount) - amount) < 1)
  return match?.id ?? null
}

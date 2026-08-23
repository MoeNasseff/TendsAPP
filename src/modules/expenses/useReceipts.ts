import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { Receipt, ReceiptItem } from '../../lib/types'

/**
 * The scanned/uploaded invoice record behind /invoices and /single-invoice.
 *
 * `save_receipt` (see useScanSave.ts) already writes every scan to
 * public.receipts with its image in the `media` bucket, so these pages read
 * that table directly rather than needing any new storage.
 */
export interface ReceiptRow extends Receipt {
  /** Flattened from the merchants join; null when extraction found no name. */
  merchant_name: string | null
}

export interface ReceiptWithItems extends ReceiptRow {
  receipt_items: ReceiptItem[]
}

/**
 * receipts has no payment-status column, but the cloned table has a Status
 * pill. Rather than invent a column, status is derived — and the rule is kept
 * here, in one place, so it is inspectable and easy to replace once a real
 * status exists:
 *
 *   Draft   — extraction did not produce a total. The record is incomplete,
 *             which is exactly what Draft means on the reference page.
 *   Unpaid  — an invoice or bill whose due date has not passed yet. These are
 *             the only documents that represent money still owed.
 *   Paid    — everything else. A receipt is by definition proof of a payment
 *             that already happened.
 *
 * If you want status stored rather than inferred, this function is the seam.
 */
export type ReceiptStatus = 'Paid' | 'Unpaid' | 'Draft'

export function statusFor(r: Pick<Receipt, 'total' | 'document_type' | 'due_at'>): ReceiptStatus {
  if (r.total == null) return 'Draft'
  const owesMoney = r.document_type === 'invoice' || r.document_type === 'bill'
  if (owesMoney && r.due_at && new Date(r.due_at) >= new Date(new Date().toDateString())) {
    return 'Unpaid'
  }
  return 'Paid'
}

/** "#323534" in the reference. Ours falls back to a short id when extraction
 *  found no invoice number, so the column is never blank. */
export function displayNumber(r: Pick<Receipt, 'invoice_number' | 'id'>): string {
  return r.invoice_number?.trim() || `#${r.id.slice(0, 8)}`
}

const SELECT = '*, merchants(name)'

type JoinedRow = Receipt & { merchants: { name: string } | null }

const flatten = (row: JoinedRow): ReceiptRow => {
  const { merchants, ...rest } = row
  return { ...rest, merchant_name: merchants?.name ?? null }
}

export function useReceipts() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('receipts')
      .select(SELECT)
      .order('issued_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    setReceipts(((data ?? []) as JoinedRow[]).map(flatten))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // A scan saved from anywhere in the app lands in the list without a refresh.
  useRealtime('receipts', load)

  return { receipts, loading, reload: load }
}

export function useReceipt(id: string | null) {
  const { user } = useAuth()
  const [receipt, setReceipt] = useState<ReceiptWithItems | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !id) {
      setReceipt(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('receipts')
      .select(`${SELECT}, receipt_items(*)`)
      .eq('id', id)
      .maybeSingle()

    if (!data) {
      setReceipt(null)
    } else {
      const row = data as JoinedRow & { receipt_items: ReceiptItem[] }
      const items = [...(row.receipt_items ?? [])].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      )
      setReceipt({ ...flatten(row), receipt_items: items })
    }
    setLoading(false)
  }, [user, id])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('receipts', load)

  return { receipt, loading }
}

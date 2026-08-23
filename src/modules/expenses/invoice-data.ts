import type { ReceiptItem } from '../../lib/types'
import type { ReceiptRow, ReceiptWithItems } from './useReceipts'

/**
 * Placeholder invoice rows, copied from the `invoiceTable()` Alpine component
 * in `assets/re-desgin/tailadmin-pro-reference/invoices.html` (line 3579).
 *
 * /invoices lists real scanned receipts now; these are shown above them as
 * demo content. They are adapted to the same `ReceiptRow` shape by
 * `DEMO_RECEIPTS` below, so the table has exactly one rendering path and no
 * "is this a demo row?" branching in the JSX.
 *
 * Delete this file and the two spots that import it (InvoicesPage's
 * `allInvoices`, SingleInvoicePage's demo lookup) to drop the demo rows.
 */
export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Draft'

export interface Invoice {
  id: number
  number: string
  merchant: string
  /** Personal spending bucket, so dashboard insights can group these. */
  category: string
  creationDate: string
  dueDate: string
  total: number
  status: InvoiceStatus
}

export const INVOICES: Invoice[] = [
  { id: 1, number: '#TND-1042', merchant: 'Carrefour Maadi', category: 'Groceries', creationDate: 'August 14, 2026', dueDate: 'August 14, 2026', total: 1284.5, status: 'Paid' },
  { id: 2, number: '#TND-1041', merchant: 'Total Fuel Station', category: 'Fuel', creationDate: 'August 12, 2026', dueDate: 'August 12, 2026', total: 620, status: 'Paid' },
  { id: 3, number: '#TND-1040', merchant: 'El Ezaby Pharmacy', category: 'Pharmacy', creationDate: 'August 11, 2026', dueDate: 'August 11, 2026', total: 214.75, status: 'Paid' },
  { id: 4, number: '#TND-1039', merchant: 'Seoudi Market', category: 'Groceries', creationDate: 'August 9, 2026', dueDate: 'August 9, 2026', total: 932, status: 'Paid' },
  { id: 5, number: '#TND-1038', merchant: 'Vodafone Egypt', category: 'Utilities', creationDate: 'August 8, 2026', dueDate: 'September 8, 2026', total: 450, status: 'Unpaid' },
  { id: 6, number: '#TND-1037', merchant: 'Zooba Downtown', category: 'Dining out', creationDate: 'August 7, 2026', dueDate: 'August 7, 2026', total: 345, status: 'Paid' },
  { id: 7, number: '#TND-1036', merchant: 'Uber', category: 'Transport', creationDate: 'August 6, 2026', dueDate: 'August 6, 2026', total: 187.25, status: 'Paid' },
  { id: 8, number: '#TND-1035', merchant: 'Spinneys', category: 'Groceries', creationDate: 'August 4, 2026', dueDate: 'August 4, 2026', total: 1105.6, status: 'Paid' },
  { id: 9, number: '#TND-1034', merchant: 'Electricity Authority', category: 'Utilities', creationDate: 'August 3, 2026', dueDate: 'September 3, 2026', total: 780, status: 'Unpaid' },
  { id: 10, number: '#TND-1033', merchant: 'Wataneya Gas', category: 'Fuel', creationDate: 'August 1, 2026', dueDate: 'August 1, 2026', total: 540, status: 'Paid' },
  { id: 11, number: '#TND-1032', merchant: 'Netflix', category: 'Subscriptions', creationDate: 'July 30, 2026', dueDate: 'July 30, 2026', total: 165, status: 'Paid' },
  { id: 12, number: '#TND-1031', merchant: 'Gold’s Gym', category: 'Health', creationDate: 'July 28, 2026', dueDate: 'July 28, 2026', total: 1500, status: 'Paid' },
  { id: 13, number: '#TND-1030', merchant: 'Carrefour Maadi', category: 'Groceries', creationDate: 'July 26, 2026', dueDate: 'July 26, 2026', total: 876.4, status: 'Paid' },
  { id: 14, number: '#TND-1029', merchant: 'Misr Pharmacy', category: 'Pharmacy', creationDate: 'July 24, 2026', dueDate: 'July 24, 2026', total: 96, status: 'Paid' },
  { id: 15, number: '#TND-1028', merchant: 'Total Fuel Station', category: 'Fuel', creationDate: 'July 22, 2026', dueDate: 'July 22, 2026', total: 600, status: 'Paid' },
  { id: 16, number: '#TND-1027', merchant: 'Cilantro', category: 'Dining out', creationDate: 'July 20, 2026', dueDate: 'July 20, 2026', total: 128.5, status: 'Paid' },
  { id: 17, number: '#TND-1026', merchant: 'Water Company', category: 'Utilities', creationDate: 'July 18, 2026', dueDate: 'August 18, 2026', total: 210, status: 'Unpaid' },
  { id: 18, number: '#TND-1025', merchant: 'B.Tech', category: 'Household', creationDate: 'July 15, 2026', dueDate: 'July 15, 2026', total: 3200, status: 'Paid' },
  { id: 19, number: '#TND-1024', merchant: 'Seoudi Market', category: 'Groceries', creationDate: 'July 12, 2026', dueDate: 'July 12, 2026', total: 1043.9, status: 'Paid' },
  { id: 20, number: '#TND-1023', merchant: 'Careem', category: 'Transport', creationDate: 'July 10, 2026', dueDate: 'July 10, 2026', total: 95, status: 'Paid' },
  { id: 21, number: '#TND-1022', merchant: 'Spotify', category: 'Subscriptions', creationDate: 'July 8, 2026', dueDate: 'July 8, 2026', total: 75, status: 'Paid' },
  { id: 22, number: '#TND-1021', merchant: 'Unknown merchant', category: 'Uncategorised', creationDate: 'July 5, 2026', dueDate: 'July 5, 2026', total: 0, status: 'Draft' },
  { id: 23, number: '#TND-1020', merchant: 'Carrefour Maadi', category: 'Groceries', creationDate: 'July 2, 2026', dueDate: 'July 2, 2026', total: 1190.25, status: 'Paid' },
]

/** Demo ids are prefixed so the single-invoice page can tell them apart from
 *  real receipt uuids without a lookup. */
export const DEMO_ID_PREFIX = 'demo-'

/** "August 7, 2028" → "2028-08-07". Parsed at midday so the UTC conversion
 *  cannot roll the date back a day in western timezones. */
function isoDate(human: string): string {
  return new Date(`${human} 12:00:00`).toISOString().slice(0, 10)
}

/**
 * Adapts a sample row to `ReceiptRow`.
 *
 * Status is not stored on a receipt — `statusFor()` derives it — so each
 * sample's status is reproduced by giving it the shape that derives to the
 * same value: Draft has no total, Unpaid is an invoice still within its due
 * date, and everything else reads as Paid.
 */
function toReceiptRow(inv: Invoice, index: number): ReceiptRow {
  return {
    id: `${DEMO_ID_PREFIX}${index + 1}`,
    user_id: DEMO_ID_PREFIX,
    expense_id: DEMO_ID_PREFIX,
    merchant_id: null,
    client_ref: `${DEMO_ID_PREFIX}${index + 1}`,
    document_type: inv.status === 'Unpaid' ? 'invoice' : 'receipt',
    image_url: null,
    invoice_number: inv.number,
    issued_at: isoDate(inv.creationDate),
    due_at: isoDate(inv.dueDate),
    subtotal: null,
    tax: null,
    total: inv.status === 'Draft' ? null : inv.total,
    currency: 'EGP',
    extraction_confidence: null,
    extraction_source: 'mock',
    raw_extraction: null,
    created_at: `${isoDate(inv.creationDate)}T12:00:00.000Z`,
    merchant_name: inv.merchant,
  }
}

export const DEMO_RECEIPTS: ReceiptRow[] = INVOICES.map(toReceiptRow)

/** A plausible personal basket, so a demo invoice opens onto household items
 *  rather than the reference's consumer-electronics order. */
function demoItems(receiptId: string): ReceiptItem[] {
  const rows: Array<[string, number, number, number]> = [
    ['Milk 1L', 2, 42, 84],
    ['Chicken breast 1kg', 1, 185, 185],
    ['Rice 5kg', 1, 165, 165],
    ['Vegetables (mixed)', 1, 120, 120],
  ]
  return rows.map(([label, quantity, unit_price, line_total], i) => ({
    id: `${receiptId}-item-${i + 1}`,
    user_id: DEMO_ID_PREFIX,
    receipt_id: receiptId,
    product_id: null,
    label,
    quantity,
    unit_price,
    line_total,
    discount: 0,
    category_id: null,
    position: i,
    created_at: new Date().toISOString(),
  }))
}

/** Resolves a `demo-*` id to a full record, so clicking a demo row opens a
 *  coherent invoice instead of the not-found state. */
export function findDemoReceipt(id: string): ReceiptWithItems | null {
  const row = DEMO_RECEIPTS.find((r) => r.id === id)
  if (!row) return null
  const receipt_items = demoItems(row.id)
  const subtotal = receipt_items.reduce((sum, i) => sum + (i.line_total ?? 0), 0)
  return {
    ...row,
    subtotal,
    tax: Math.round(subtotal * 0.1 * 100) / 100,
    total: row.total ?? subtotal,
    receipt_items,
  }
}

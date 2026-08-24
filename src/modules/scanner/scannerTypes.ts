import type { DocumentType, ExtractionSource } from '../../lib/types'

export interface ExtractedLineItem {
  label: string
  quantity: number | null
  unit_price: number | null
  line_total: number | null
  discount: number | null
  category_id: string | null
  position: number | null
  /** Only when the model actually identified a distinct product — feeds
   * `products`/`price_observations` in save_receipt. Absent for a line item
   * that is just a label with no brand/size signal. */
  product?: { name: string; brand?: string | null; size_value?: number | null; size_unit?: string | null } | null
}

/**
 * The one shape every extraction source (mock now, AI later) produces, and
 * the exact payload `save_receipt` expects — see
 * supabase/migrations/20260816000001_receipts.sql for the contract.
 */
export interface ExtractedReceipt {
  client_ref: string
  merchant: { name: string; branch?: string | null } | null
  document_type: DocumentType | null
  image_url: string | null
  invoice_number: string | null
  issued_at: string | null
  due_at: string | null
  subtotal: number | null
  tax: number | null
  total: number
  currency: string
  extraction_confidence: number | null
  extraction_source: ExtractionSource
  raw_extraction: unknown
  category_id: string | null
  note: string | null
  spent_at: string
  items: ExtractedLineItem[]
}

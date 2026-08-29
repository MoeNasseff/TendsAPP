import { useEffect, useRef, useState } from 'react'
import { Camera, ScanLine, Upload, Check, X, Pencil, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Modal } from '../../components/Modal'
import { Portal } from '../../components/Portal'
import { useToast } from '../../hooks/useToast'
import { useAIProviders } from '../../hooks/useAIProviders'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import { fade, fadeUp } from '../../lib/motion'
import { newId } from '../../lib/id'
import { saveReceipt } from './useScanSave'
import { extractReceipt, type CategoryOption, type ExtractedFields, type ExtractionFailureReason } from './extract'
import type { ExtractedReceipt } from './scannerTypes'
import type { DocumentType, ExtractionSource } from '../../lib/types'

interface LineItem {
  id: string
  label: string
  amount: number
  quantity: number | null
  unitPrice: number | null
  discount: number | null
  brand: string | null
  sizeValue: number | null
  sizeUnit: string | null
}

interface ScannedInvoice {
  id: string
  clientRef: string
  file: File | null
  fileName: string
  vendor: string
  date: string
  documentType: DocumentType
  categoryId: string | null
  amount: number
  currency: string
  confidence: number | null
  lineItems: LineItem[]
  rawExtraction: unknown
  extractionSource: ExtractionSource
  status: 'processing' | 'review' | 'approved'
  saving: boolean
  saveError: string | null
  extractError: string | null
}

function extractErrorMessage(reason: ExtractionFailureReason): string {
  switch (reason) {
    case 'unavailable':
      return 'No AI provider is configured — enter this one manually, or add a key in Settings.'
    case 'byok_not_configured':
      return 'Your AI key isn’t set up yet — enter this one manually, or fix it in Settings.'
    case 'provider_error':
      return 'The AI provider couldn’t read this image — try again, or enter it manually.'
    case 'transport_error':
      return 'Couldn’t reach the AI service — check your connection and try again.'
    case 'invalid_document':
      return 'This doesn’t look like a receipt or invoice — try another photo, or enter it manually.'
    case 'malformed_response':
      return 'Couldn’t make sense of what came back — try again, or enter it manually.'
  }
}

/** Applies whatever the extraction call produced — full or partial — onto
 * an invoice. Only overwrites fields that actually came back so a partial
 * read never blanks out something the user already fixed on retry. */
function applyFields(fields: Partial<ExtractedFields>): Partial<ScannedInvoice> {
  const patch: Partial<ScannedInvoice> = {}
  if (fields.merchantName !== undefined && fields.merchantName !== null) patch.vendor = fields.merchantName
  if (fields.issuedAt) patch.date = fields.issuedAt
  if (fields.documentType) patch.documentType = fields.documentType
  if (fields.categoryId !== undefined) patch.categoryId = fields.categoryId
  if (fields.total !== undefined && fields.total !== null) patch.amount = fields.total
  if (fields.currency) patch.currency = fields.currency
  if (fields.confidence !== undefined) patch.confidence = fields.confidence
  if (fields.items) {
    patch.lineItems = fields.items.map((item, i) => ({
      id: `l${i}`,
      label: item.label,
      amount: item.lineTotal ?? item.unitPrice ?? 0,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      brand: item.brand,
      sizeValue: item.sizeValue,
      sizeUnit: item.sizeUnit,
    }))
  }
  return patch
}

function hasAnyField(fields: Partial<ExtractedFields>): boolean {
  return Object.values(fields).some((v) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
}

export function ScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showToast = useToast()
  const { resolutionFor, states } = useAIProviders()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [invoices, setInvoices] = useState<ScannedInvoice[]>([])
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('expense_categories')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setCategories((data as CategoryOption[] | null) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function runExtraction(id: string, file: File) {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: 'processing', extractError: null } : inv)))

    const resolution = resolutionFor('vision')
    const model = states.find((s) => s.provider === 'gemini')?.model ?? undefined

    // extractReceipt reports failure by return value, but an unforeseen throw
    // here would otherwise leave the ticket spinning on 'processing' with
    // nothing on screen to explain it. A visible error beats a silent hang.
    let outcome: Awaited<ReturnType<typeof extractReceipt>>
    try {
      outcome = await extractReceipt(file, resolution, categories, model)
    } catch {
      outcome = { ok: false, reason: 'provider_error', fields: {} }
    }

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv
        if (outcome.ok) {
          return {
            ...inv,
            ...applyFields(outcome.fields),
            rawExtraction: outcome.raw,
            extractionSource: 'ai',
            status: 'review',
            extractError: null,
          }
        }
        return {
          ...inv,
          ...applyFields(outcome.fields),
          extractionSource: hasAnyField(outcome.fields) ? 'ai' : inv.extractionSource,
          status: 'review',
          extractError: extractErrorMessage(outcome.reason),
        }
      }),
    )
    setReviewingId(id)
  }

  function handleFile(file: File) {
    const id = newId()
    const entry: ScannedInvoice = {
      id,
      clientRef: newId(),
      file,
      fileName: file.name,
      status: 'processing',
      vendor: '',
      date: '',
      documentType: 'receipt',
      categoryId: null,
      amount: 0,
      currency: 'EGP',
      confidence: null,
      lineItems: [],
      rawExtraction: null,
      extractionSource: 'manual',
      saving: false,
      saveError: null,
      extractError: null,
    }
    setInvoices((prev) => [entry, ...prev])
    void runExtraction(id, file)
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    handleFile(files[0])
  }

  function updateReviewing(patch: Partial<ScannedInvoice>) {
    if (!reviewingId) return
    setInvoices((prev) => prev.map((inv) => (inv.id === reviewingId ? { ...inv, ...patch } : inv)))
  }

  function retryExtraction() {
    const invoice = invoices.find((inv) => inv.id === reviewingId)
    if (invoice?.file) void runExtraction(invoice.id, invoice.file)
  }

  async function hangUp() {
    const invoice = invoices.find((inv) => inv.id === reviewingId)
    if (!invoice) return

    setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? { ...inv, saving: true, saveError: null } : inv)))

    // client_ref was minted once, when this scan entered review — reusing it
    // here (including on a retry after failure) is what makes the save
    // idempotent: save_receipt returns the existing expense instead of
    // writing a duplicate if this exact client_ref already succeeded.
    const extracted: ExtractedReceipt = {
      client_ref: invoice.clientRef,
      merchant: invoice.vendor ? { name: invoice.vendor } : null,
      document_type: invoice.documentType,
      image_url: null,
      invoice_number: null,
      issued_at: invoice.date || null,
      due_at: null,
      subtotal: null,
      tax: null,
      total: invoice.amount,
      currency: invoice.currency,
      extraction_confidence: invoice.confidence,
      extraction_source: invoice.extractionSource,
      raw_extraction: invoice.rawExtraction,
      category_id: invoice.categoryId,
      note: null,
      spent_at: invoice.date || new Date().toISOString().slice(0, 10),
      items: invoice.lineItems.map((item, i) => ({
        label: item.label,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.amount,
        discount: item.discount,
        category_id: null,
        position: i,
        // A product row is emitted for every line that has a price, not only
        // for lines carrying a brand or a pack size. The old gate required
        // one of those two, which meant a receipt printing category-style
        // lines ("Prescription refill", "Produce & bakery") created no
        // products at all — and since price_observations requires a
        // product_id, no price history either. Brand and size stay optional
        // and still sharpen the match: they are part of the uniqueness key,
        // and analytics flags a product lacking them as a 'possible' rather
        // than 'exact' match rather than silently conflating two things.
        product: item.unitPrice !== null || item.amount !== null
          ? { name: item.label, brand: item.brand, size_value: item.sizeValue, size_unit: item.sizeUnit }
          : null,
      })),
    }

    try {
      await saveReceipt(extracted, invoice.file)
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoice.id ? { ...inv, status: 'approved', saving: false } : inv)),
      )
      setReviewingId(null)
      showToast('Expense saved', 'success')
    } catch (err) {
      // Never close the modal on a failed save — that would silently lose
      // the user's corrections. The same client_ref is still on the
      // invoice, so hitting "Hang it up" again safely retries.
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, saving: false, saveError: err instanceof Error ? err.message : 'Failed to save expense' }
            : inv,
        ),
      )
    }
  }

  function discard(id: string) {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id))
    if (reviewingId === id) setReviewingId(null)
  }

  const reviewing = invoices.find((inv) => inv.id === reviewingId) ?? null

  return (
    <>
      <Modal open={open} onClose={onClose} title="Scan a receipt" size="lg">
        <div className="flex flex-col gap-8">
          <CaptureCard onFiles={handleFilesSelected} onOpenCamera={() => setShowCamera(true)} inputRef={fileInputRef} />

          {invoices.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-micro uppercase text-gray-500 dark:text-gray-400">On the hook</h2>
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {invoices.map((inv) => (
                    <InvoiceTicket
                      key={inv.id}
                      invoice={inv}
                      categories={categories}
                      onReview={() => setReviewingId(inv.id)}
                      onDiscard={() => discard(inv.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      </Modal>

      {/* Both overlays below render through Portal, same as Modal itself —
          escaping any .glass ancestor's backdrop-filter, which would otherwise
          become the containing block for their `fixed` positioning and trap
          them behind Modal's own (correctly portaled) overlay. See Portal.tsx. */}
      <ReviewPanel
        invoice={reviewing}
        categories={categories}
        onClose={() => setReviewingId(null)}
        onChange={updateReviewing}
        onHangUp={hangUp}
        onDiscard={() => reviewing && discard(reviewing.id)}
        onRetryExtract={retryExtraction}
      />

      <AnimatePresence>
        {showCamera && (
          <Portal>
            <CameraCapture
              onCapture={(file) => {
                setShowCamera(false)
                handleFile(file)
              }}
              onClose={() => setShowCamera(false)}
            />
          </Portal>
        )}
      </AnimatePresence>
    </>
  )
}

function CaptureCard({
  onFiles,
  onOpenCamera,
  inputRef,
}: {
  onFiles: (files: FileList | null) => void
  onOpenCamera: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <motion.div
      {...fadeUp}
      className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mood-accent/15 text-mood-accent">
        <ScanLine className="h-6 w-6" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-slate-900 dark:text-white">Photograph or upload an invoice</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          It hangs on the hook while it's read, then you check it before it's filed.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={onOpenCamera}
          className="tap-target flex items-center justify-center gap-2 rounded-lg bg-mood-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Camera className="h-4 w-4" />
          Scan with camera
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="tap-target flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <Upload className="h-4 w-4" />
          Upload a photo
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </motion.div>
  )
}

function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't reach the camera here — upload a photo instead.")
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(() => setError("Couldn't reach the camera — check permissions, or upload a photo instead."))

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capture() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCapture(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      // Above the header's z-99999. At z-50 the sticky header painted straight
      // over the top of the camera feed — the viewfinder is meant to be the
      // only thing on screen, so it has to outrank every piece of app chrome.
      className="fixed inset-0 z-[100000] bg-black"
    >
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-white">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="tap-target rounded-lg bg-mood-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-mood-accent/60" />
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-between p-4"
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel"
              className="tap-target rounded-full bg-black/50 p-2 text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-micro uppercase text-white/80">Frame the receipt</span>
            <span className="w-9" />
          </div>
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-center p-8"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={capture}
              disabled={!ready}
              aria-label="Capture photo"
              className="tap-target flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/10 disabled:opacity-40"
            >
              <span className="h-12 w-12 rounded-full bg-mood-accent" />
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}

function InvoiceTicket({
  invoice,
  categories,
  onReview,
  onDiscard,
}: {
  invoice: ScannedInvoice
  categories: CategoryOption[]
  onReview: () => void
  onDiscard: () => void
}) {
  const categoryName = categories.find((c) => c.id === invoice.categoryId)?.name ?? 'Uncategorized'
  return (
    <motion.div
      layout
      {...fade}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mood-accent/15 text-mood-accent">
        {invoice.status === 'processing' ? (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ScanLine className="h-4 w-4" />
          </motion.div>
        ) : invoice.status === 'approved' ? (
          <Check className="h-4 w-4" />
        ) : (
          <Pencil className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
          {invoice.status === 'processing' ? 'Reading receipt…' : invoice.vendor || 'Untitled'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {invoice.status === 'processing'
            ? invoice.fileName
            : invoice.status === 'approved'
              ? `Hung up · ${categoryName}`
              : `Needs a look · ${categoryName}`}
        </p>
      </div>
      {invoice.status !== 'processing' && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatCurrency(invoice.amount, invoice.currency)}
          </span>
          {invoice.status === 'review' && (
            <button
              type="button"
              onClick={onReview}
              className="tap-target rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-mood-accent"
            >
              Review
            </button>
          )}
          <button
            type="button"
            onClick={onDiscard}
            aria-label={`Discard ${invoice.vendor || invoice.fileName}`}
            className="tap-target rounded-lg p-1.5 text-slate-500 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

function ReviewPanel({
  invoice,
  categories,
  onClose,
  onChange,
  onHangUp,
  onDiscard,
  onRetryExtract,
}: {
  invoice: ScannedInvoice | null
  categories: CategoryOption[]
  onClose: () => void
  onChange: (patch: Partial<ScannedInvoice>) => void
  onHangUp: () => void | Promise<void>
  onDiscard: () => void
  onRetryExtract: () => void
}) {
  return (
    <AnimatePresence>
      {invoice && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs sm:items-center"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="glass max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display text-display-sm text-slate-900 dark:text-white">Check before it's filed</h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="tap-target rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {invoice.confidence !== null && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-white/5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-mood-accent"
                      style={{ width: `${Math.min(100, Math.max(0, Math.round(invoice.confidence * 100)))}%` }}
                    />
                  </div>
                  <span className="text-micro uppercase text-gray-500 dark:text-gray-400">
                    {Math.round(invoice.confidence * 100)}% read
                  </span>
                </div>
              )}

              {invoice.extractError && (
                <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <p>{invoice.extractError}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onRetryExtract}
                      disabled={invoice.status === 'processing'}
                      className="tap-target flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 font-medium disabled:opacity-50"
                    >
                      {invoice.status === 'processing' && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      {invoice.status === 'processing' ? 'Retrying…' : 'Retry'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ extractError: null })}
                      disabled={invoice.status === 'processing'}
                      className="tap-target rounded-lg px-3 py-1.5 font-medium text-slate-500 hover:bg-white/5 disabled:opacity-50 dark:text-slate-400"
                    >
                      Enter manually
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Vendor</span>
                  <input
                    value={invoice.vendor}
                    onChange={(e) => onChange({ vendor: e.target.value })}
                    className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Date</span>
                    <input
                      type="date"
                      value={invoice.date}
                      onChange={(e) => onChange({ date: e.target.value })}
                      className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Category</span>
                    <select
                      value={invoice.categoryId ?? ''}
                      onChange={(e) => onChange({ categoryId: e.target.value || null })}
                      className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-hidden"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Line items</span>
                  <div className="flex flex-col divide-y divide-white/10">
                    {invoice.lineItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 text-sm text-slate-200">
                        <span>{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.amount, invoice.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Total</span>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.amount}
                    onChange={(e) => onChange({ amount: Number(e.target.value) || 0 })}
                    className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-lg font-semibold text-slate-200 outline-hidden"
                  />
                </label>

                {invoice.saveError && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {invoice.saveError} — your edits are still here, try again.
                  </p>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={onHangUp}
                    disabled={invoice.saving || invoice.status === 'processing'}
                    className="tap-target flex flex-1 items-center justify-center gap-2 rounded-lg bg-mood-accent py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {invoice.saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {invoice.saving ? 'Saving…' : invoice.saveError ? 'Retry' : 'Hang it up'}
                  </button>
                  <button
                    type="button"
                    onClick={onDiscard}
                    disabled={invoice.saving}
                    className="tap-target rounded-lg border border-white/10 px-4 text-sm text-slate-400 hover:bg-white/5 disabled:opacity-50"
                  >
                    Discard
                  </button>
                </div>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Filed to Expenses once hung up — check the read against the paper before you confirm.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  )
}

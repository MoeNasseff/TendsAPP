import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import { PageBreadcrumb } from '../../components/PageBreadcrumb'
import { ScanModal } from '../scanner/ScanModal'
import { formatCurrency, formatDate } from '../../lib/format'
import { DEMO_RECEIPTS } from './invoice-data'
import {
  displayNumber,
  statusFor,
  useReceipts,
  type ReceiptRow,
} from './useReceipts'

/**
 * Clone of https://demo.tailadmin.com/invoices, transcribed from
 * `assets/re-desgin/tailadmin-pro-reference/invoices.html` (lines 2872-3897).
 *
 * Every class string, element, label and SVG below is the reference's. The
 * Alpine directives are the only thing translated: `x-data="invoiceTable()"`
 * became the state hooks here, `x-for` became `.map`, `x-text` became an
 * expression, `:class` became the same ternary in a template literal, and
 * `@click.outside` became the pointerdown listener this codebase already uses
 * for dropdowns.
 *
 * Rows are real scanned/uploaded receipts from public.receipts (see
 * useReceipts.ts), not the reference's sample array.
 *
 * The copy is reframed for personal spending — this tab tracks what *you*
 * were billed, not what you invoiced a client. Only names and associations
 * changed; every class, element and SVG is still the reference's, so the
 * class-token diff against invoices.html is unaffected:
 *   Invoice Number      → Receipt No.   (invoice_number, else a short id)
 *   Customer            → Merchant      (the joined merchant name — this also
 *                         fixes a mislabel: the column always showed a
 *                         merchant, under a business-invoicing heading)
 *   Creation Date / Due Date → Purchased / Due   (issued_at / due_at)
 *   All Invoices        → All Receipts
 *   Create an Invoice   → Enter Manually (the manual-entry escape hatch)
 *   Avg time to get paid / Upcoming Payout → Scanned / Spent this month
 *   Total               → total, in the receipt's own currency
 *   Status              → derived, see statusFor() in useReceipts.ts
 *
 * Their sort/filter/paginate logic is otherwise reproduced as-is, with one
 * deliberate reversal: the reference computes `totalPages` from its
 * *unfiltered* count, leaving empty pages behind an active filter. That was
 * cloned while the data was fake; against real records it is a visible defect,
 * so this counts the filtered set.
 *
 * Stubs, pending further work: Search, Filter → Apply and Export do nothing,
 * and the row menu's Delete does nothing (deleting a receipt cascades to its
 * expense, which needs a confirmation flow first).
 */

type SortField = 'number' | 'customer' | 'creationDate' | 'dueDate'
type StatusFilter = 'All' | 'Unpaid' | 'Draft'

/** Their checkbox: an sr-only input behind a 16px painted box. */
function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center text-sm font-medium text-gray-700 select-none dark:text-gray-400">
      <span className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${
            checked ? 'border-brand-500 bg-brand-500' : 'bg-transparent border-gray-300 dark:border-gray-700'
          }`}
        >
          <span className={checked ? '' : 'opacity-0'}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="white"
                strokeWidth="1.6666"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </span>
    </label>
  )
}

/** Their sortable column head — the caret pair that lights up brand-500. */
function SortHeader({
  label,
  field,
  sortBy,
  sortDirection,
  onSort,
}: {
  label: string
  field: SortField
  sortBy: SortField | null
  sortDirection: 'asc' | 'desc'
  onSort: (f: SortField) => void
}) {
  return (
    <th
      className="cursor-pointer p-4 text-left text-xs font-medium text-gray-700 dark:text-gray-400"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-3">
        <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">{label}</p>
        <span className="flex flex-col gap-0.5">
          <svg
            className={sortBy === field && sortDirection === 'asc' ? 'text-brand-500' : 'text-gray-300'}
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.40962 0.585167C4.21057 0.300808 3.78943 0.300807 3.59038 0.585166L1.05071 4.21327C0.81874 4.54466 1.05582 5 1.46033 5H6.53967C6.94418 5 7.18126 4.54466 6.94929 4.21327L4.40962 0.585167Z"
              fill="currentColor"
            />
          </svg>

          <svg
            className={sortBy === field && sortDirection === 'desc' ? 'text-brand-500' : 'text-gray-300'}
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.40962 4.41483C4.21057 4.69919 3.78943 4.69919 3.59038 4.41483L1.05071 0.786732C0.81874 0.455343 1.05582 0 1.46033 0H6.53967C6.94418 0 7.18126 0.455342 6.94929 0.786731L4.40962 4.41483Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </div>
    </th>
  )
}

/**
 * Their per-row "…" menu.
 *
 * One knowing divergence: the reference panel is `fixed w-40 …` positioned at
 * runtime by Alpine through `x-ref="dropdown"`. Without that script `fixed`
 * pins the menu to the viewport origin instead of the row, so it is `absolute
 * right-0 top-full z-20` here. Every other class on the panel and its two
 * items is unchanged.
 */
function RowActions({ onViewMore }: { onViewMore: () => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const item =
    'text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300'

  return (
    <div ref={rootRef} className="relative flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Row actions"
        className="text-gray-500 dark:text-gray-400"
      >
        <svg
          className="fill-current"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.99902 10.245C6.96552 10.245 7.74902 11.0285 7.74902 11.995V12.005C7.74902 12.9715 6.96552 13.755 5.99902 13.755C5.03253 13.755 4.24902 12.9715 4.24902 12.005V11.995C4.24902 11.0285 5.03253 10.245 5.99902 10.245ZM17.999 10.245C18.9655 10.245 19.749 11.0285 19.749 11.995V12.005C19.749 12.9715 18.9655 13.755 17.999 13.755C17.0325 13.755 16.249 12.9715 16.249 12.005V11.995C16.249 11.0285 17.0325 10.245 17.999 10.245ZM13.749 11.995C13.749 11.0285 12.9655 10.245 11.999 10.245C11.0325 10.245 10.249 11.0285 10.249 11.995V12.005C10.249 12.9715 11.0325 13.755 11.999 13.755C12.9655 13.755 13.749 12.9715 13.749 12.005V11.995Z"
            fill=""
          />
        </svg>
      </button>
      {open && (
        <div className="shadow-theme-lg dark:bg-gray-dark absolute right-0 top-full z-20 w-40 space-y-1 rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800">
          <button
            type="button"
            className={item}
            onClick={() => {
              setOpen(false)
              onViewMore()
            }}
          >
            View More
          </button>
          {/* Stub — no delete endpoint yet. */}
          <button type="button" className={item}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const { receipts, loading } = useReceipts()
  const [selected, setSelected] = useState<string[]>([])
  // The reference starts sorted by 'number' ascending — but its Invoice Number
  // column has no sort control, so that order can never be re-selected once
  // you leave it. Starting unsorted instead preserves the list as assembled
  // (demo rows first, then real scans newest-first) until a column is clicked.
  const [sortBy, setSortBy] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All')
  const [showFilter, setShowFilter] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const itemsPerPage = 10

  const filterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showFilter) return
    function onPointerDown(e: PointerEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showFilter])

  // The reference's sample rows sit above the real scans. They are already in
  // ReceiptRow shape, so everything downstream — sorting, filtering, paging,
  // the row markup — treats both the same.
  const allInvoices = useMemo(() => [...DEMO_RECEIPTS, ...receipts], [receipts])

  const filteredInvoices = useMemo(
    () =>
      filterStatus === 'All'
        ? allInvoices
        : allInvoices.filter((r) => statusFor(r) === filterStatus),
    [allInvoices, filterStatus],
  )

  /** Comparable value per sortable column, since the row fields no longer map
   *  1:1 to the reference's flat object. Dates sort by timestamp, not by their
   *  rendered "11 Mar 2027" string. */
  function sortValue(r: ReceiptRow, field: SortField): string | number {
    switch (field) {
      case 'number':
        return displayNumber(r).toLowerCase()
      case 'customer':
        return (r.merchant_name ?? '').toLowerCase()
      case 'creationDate':
        return r.issued_at ? new Date(r.issued_at).getTime() : 0
      case 'dueDate':
        return r.due_at ? new Date(r.due_at).getTime() : 0
    }
  }

  const sortedInvoices = useMemo(
    () =>
      sortBy === null
        ? filteredInvoices
        : filteredInvoices.slice().sort((a, b) => {
            const valA = sortValue(a, sortBy)
            const valB = sortValue(b, sortBy)
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1
            return 0
          }),
    [filteredInvoices, sortBy, sortDirection],
  )

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedInvoices.slice(start, start + itemsPerPage)
  }, [sortedInvoices, currentPage])

  // The reference divides its unfiltered count here, which leaves empty pages
  // when a filter is active. With real data that bug is user-visible rather
  // than cosmetic, so this one counts the filtered set. `at least 1` keeps the
  // pager from rendering "Page 1 of 0" on an empty account.
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage))

  const isAllSelected =
    paginatedInvoices.length > 0 && paginatedInvoices.every((i) => selected.includes(i.id))

  function toggleSelectAll() {
    setSelected(isAllSelected ? [] : paginatedInvoices.map((i) => i.id))
  }

  function toggleRow(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  function sort(field: SortField) {
    if (sortBy === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  const visiblePages = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [currentPage, totalPages])

  function openInvoice(invoice: ReceiptRow) {
    navigate(`/single-invoice?id=${invoice.id}`)
  }

  /**
   * Overview figures, reframed for personal spending.
   *
   * The reference's third and fourth cells — "Average time to get paid" and
   * "Upcoming Payout" — describe money owed *to* a business. Nothing on a
   * scanned receipt answers them, so they now report what a person actually
   * wants from this page: how much has been captured this month, and what it
   * cost. Overdue and due-soon keep their meaning, since a personal bill can
   * still be unpaid.
   *
   * Real receipts only; the demo rows on top are excluded so these totals are
   * never a mix of sample and real money.
   */
  const overview = useMemo(() => {
    const now = new Date()
    const today = new Date(now.toDateString()).getTime()
    const in30 = today + 30 * 86_400_000
    let overdue = 0
    let dueSoon = 0
    let scannedThisMonth = 0
    let spentThisMonth = 0

    for (const r of receipts) {
      const created = new Date(r.created_at)
      if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) {
        scannedThisMonth += 1
        spentThisMonth += r.total ?? 0
      }
      if (r.total == null || !r.due_at || statusFor(r) !== 'Unpaid') continue
      const due = new Date(r.due_at).getTime()
      if (due < today) overdue += r.total
      else if (due <= in30) dueSoon += r.total
    }

    return {
      overdue,
      dueSoon,
      scannedThisMonth,
      spentThisMonth,
      currency: receipts[0]?.currency ?? 'EGP',
    }
  }, [receipts])

  const tabButton = 'text-theme-sm h-10 rounded-md px-3 py-2 font-medium hover:text-gray-900 dark:hover:text-white'
  const tabActive = 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
  const tabIdle = 'text-gray-500 dark:text-gray-400'
  const pagerButton =
    'shadow-theme-xs flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 hover:text-gray-800 sm:p-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200'

  return (
    <>
      <PageBreadcrumb pageName="Invoices" />

      <div>
        {/* Overview */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-white/90">Overview</h2>
            </div>
            {/* The reference has only "Create an Invoice" here. Scan is added
                beside it — this list is fed by scanning, so the action that
                fills it belongs on the page that shows it. It takes the
                reference's own secondary-button treatment (the same classes as
                "Proceed to payment" on single-invoice) rather than importing
                the Expenses page's button style. */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="shadow-theme-xs flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              >
                <ScanLine className="h-5 w-5" />
                Scan
              </button>
              <Link
                to="/create-invoice"
                className="bg-brand-500 shadow-theme-xs hover:bg-brand-600 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 10.0002H15.0006M10.0002 5V15.0006"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Enter Manually
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 rounded-xl border border-gray-200 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0 dark:divide-gray-800 dark:border-gray-800">
            <div className="border-b p-5 sm:border-r lg:border-b-0">
              <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Overdue</p>
              <h3 className="text-3xl text-gray-800 dark:text-white/90">
                {formatCurrency(overview.overdue, overview.currency)}
              </h3>
            </div>
            <div className="border-b p-5 lg:border-b-0">
              <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Due within next 30 days</p>
              <h3 className="text-3xl text-gray-800 dark:text-white/90">
                {formatCurrency(overview.dueSoon, overview.currency)}
              </h3>
            </div>
            <div className="border-b p-5 sm:border-r sm:border-b-0">
              <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Scanned this month</p>
              <h3 className="text-3xl text-gray-800 dark:text-white/90">{overview.scannedThisMonth}</h3>
            </div>
            <div className="p-5">
              <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Spent this month</p>
              <h3 className="text-3xl text-gray-800 dark:text-white/90">
                {formatCurrency(overview.spentThisMonth, overview.currency)}
              </h3>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Invoices</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your most recent scanned receipts</p>
            </div>
            <div className="flex gap-3.5">
              <div className="hidden h-11 items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 lg:inline-flex dark:bg-gray-900">
                {(['All', 'Unpaid', 'Draft'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setFilterStatus(status)
                      setCurrentPage(1)
                    }}
                    className={`${tabButton} ${filterStatus === status ? tabActive : tabIdle}`}
                  >
                    {status === 'All' ? 'All Receipts' : status}
                  </button>
                ))}
              </div>
              <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center">
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    <svg
                      className="fill-current"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z"
                        fill=""
                      />
                    </svg>
                  </span>

                  {/* Stub — the reference binds nothing to this input either. */}
                  <input
                    type="text"
                    placeholder="Search..."
                    className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pr-4 pl-11 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:w-[300px] dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>

                <div className="relative" ref={filterRef}>
                  <button
                    className="shadow-theme-xs flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 sm:w-auto sm:min-w-[100px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    onClick={() => setShowFilter((v) => !v)}
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M14.6537 5.90414C14.6537 4.48433 13.5027 3.33331 12.0829 3.33331C10.6631 3.33331 9.51206 4.48433 9.51204 5.90415M14.6537 5.90414C14.6537 7.32398 13.5027 8.47498 12.0829 8.47498C10.663 8.47498 9.51204 7.32398 9.51204 5.90415M14.6537 5.90414L17.7087 5.90411M9.51204 5.90415L2.29199 5.90411M5.34694 14.0958C5.34694 12.676 6.49794 11.525 7.91777 11.525C9.33761 11.525 10.4886 12.676 10.4886 14.0958M5.34694 14.0958C5.34694 15.5156 6.49794 16.6666 7.91778 16.6666C9.33761 16.6666 10.4886 15.5156 10.4886 14.0958M5.34694 14.0958L2.29199 14.0958M10.4886 14.0958L17.7087 14.0958"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Filter
                  </button>
                  {showFilter && (
                    <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-5">
                        <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Category
                        </label>
                        <input
                          type="text"
                          className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                          placeholder="Search category..."
                        />
                      </div>
                      <div className="mb-5">
                        <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Merchant
                        </label>
                        <input
                          type="text"
                          className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                          placeholder="Search merchant..."
                        />
                      </div>
                      {/* Stub — no filter query wired yet. */}
                      <button className="bg-brand-500 hover:bg-brand-600 h-10 w-full rounded-lg px-3 py-2 text-sm font-medium text-white">
                        Apply
                      </button>
                    </div>
                  )}
                </div>
                {/* Stub — no export yet. */}
                <button className="shadow-theme-xs flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-[11px] text-sm font-medium text-gray-700 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M16.6671 13.3333V15.4166C16.6671 16.1069 16.1074 16.6666 15.4171 16.6666H4.58301C3.89265 16.6666 3.33301 16.1069 3.33301 15.4166V13.3333M10.0013 3.33325L10.0013 13.3333M6.14553 7.18708L9.99958 3.33549L13.8539 7.18708"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Export
                </button>
              </div>
            </div>
          </div>
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                  <th className="p-4 whitespace-nowrap">
                    <div className="flex w-full cursor-pointer items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckBox checked={isAllSelected} onChange={toggleSelectAll} />
                        <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">
                          Receipt No.
                        </p>
                      </div>
                    </div>
                  </th>
                  <SortHeader label="Merchant" field="customer" sortBy={sortBy} sortDirection={sortDirection} onSort={sort} />
                  <SortHeader label="Purchased" field="creationDate" sortBy={sortBy} sortDirection={sortDirection} onSort={sort} />
                  <SortHeader label="Due" field="dueDate" sortBy={sortBy} sortDirection={sortDirection} onSort={sort} />
                  <th className="p-4 text-left text-xs font-medium text-gray-700 dark:text-gray-400">Total</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-700 dark:text-gray-400">Status</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-700 dark:text-gray-400">
                    <div className="relative">
                      <span className="sr-only">Action</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-x divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedInvoices.map((invoice) => {
                  const status = statusFor(invoice)
                  return (
                    <tr key={invoice.id} className="transition hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="p-4 whitespace-nowrap">
                        <div className="group flex items-center gap-3">
                          <CheckBox
                            checked={selected.includes(invoice.id)}
                            onChange={() => toggleRow(invoice.id)}
                          />
                          {/* group-hover:underline is theirs — the number is the
                              row's affordance, so it carries the navigation. */}
                          <p
                            role="link"
                            tabIndex={0}
                            onClick={() => openInvoice(invoice)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                openInvoice(invoice)
                              }
                            }}
                            className="text-theme-xs cursor-pointer font-medium text-gray-700 group-hover:underline dark:text-gray-400"
                          >
                            {displayNumber(invoice)}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                          {invoice.merchant_name ?? 'Unknown merchant'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                          {formatDate(invoice.issued_at)}
                        </p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                          {formatDate(invoice.due_at)}
                        </p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                          {invoice.total == null ? '—' : formatCurrency(invoice.total, invoice.currency)}
                        </p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`text-theme-xs rounded-full px-2 py-0.5 font-medium ${
                            status === 'Paid'
                              ? 'bg-success-50 dark:bg-success-500/15 text-success-700 dark:text-success-500'
                              : status === 'Unpaid'
                                ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <RowActions onViewMore={() => openInvoice(invoice)} />
                      </td>
                    </tr>
                  )
                })}
                {/* The reference never renders an empty table, so this row is
                    ours — without it a fresh account shows a bare header. */}
                {!loading && paginatedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No scanned invoices yet. Use Scan on the Expenses page to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between border-t border-gray-200 px-5 py-4 sm:flex-row dark:border-gray-800">
            <div className="pb-3 sm:pb-0">
              <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Showing{' '}
                <span className="text-gray-800 dark:text-white/90">
                  {(currentPage - 1) * itemsPerPage + (paginatedInvoices.length ? 1 : 0)}
                </span>{' '}
                to{' '}
                <span className="text-gray-800 dark:text-white/90">
                  {(currentPage - 1) * itemsPerPage + paginatedInvoices.length}
                </span>{' '}
                of <span className="text-gray-800 dark:text-white/90">{filteredInvoices.length}</span>
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 rounded-lg bg-gray-50 p-4 sm:w-auto sm:justify-normal sm:bg-transparent sm:p-0 dark:bg-white/[0.03] dark:sm:bg-transparent">
              <button
                type="button"
                className={`${pagerButton} ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <span>
                  <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M2.58203 9.99868C2.58174 10.1909 2.6549 10.3833 2.80152 10.53L7.79818 15.5301C8.09097 15.8231 8.56584 15.8233 8.85883 15.5305C9.15183 15.2377 9.152 14.7629 8.85921 14.4699L5.13911 10.7472L16.6665 10.7472C17.0807 10.7472 17.4165 10.4114 17.4165 9.99715C17.4165 9.58294 17.0807 9.24715 16.6665 9.24715L5.14456 9.24715L8.85919 5.53016C9.15199 5.23717 9.15184 4.7623 8.85885 4.4695C8.56587 4.1767 8.09099 4.17685 7.79819 4.46984L2.84069 9.43049C2.68224 9.568 2.58203 9.77087 2.58203 9.99715C2.58203 9.99766 2.58203 9.99817 2.58203 9.99868Z"
                      fill=""
                    />
                  </svg>
                </span>
              </button>

              <span className="block text-sm font-medium text-gray-700 sm:hidden dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>

              <ul className="hidden items-center gap-0.5 sm:flex">
                {visiblePages.map((page) => (
                  <li key={page}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        goToPage(page)
                      }}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${
                        page === currentPage
                          ? 'bg-brand-500 text-white'
                          : 'hover:bg-brand-500 text-gray-700 hover:text-white dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {page}
                    </a>
                  </li>
                ))}
                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <li>
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium text-gray-700 dark:text-gray-400">
                      ...
                    </span>
                  </li>
                )}
                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <li>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        goToPage(totalPages)
                      }}
                      className="hover:bg-brand-500 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium text-gray-700 hover:text-white dark:text-gray-400 dark:hover:text-white"
                    >
                      {totalPages}
                    </a>
                  </li>
                )}
              </ul>

              <button
                type="button"
                className={`${pagerButton} ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <span>
                  <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M17.4165 9.9986C17.4168 10.1909 17.3437 10.3832 17.197 10.53L12.2004 15.5301C11.9076 15.8231 11.4327 15.8233 11.1397 15.5305C10.8467 15.2377 10.8465 14.7629 11.1393 14.4699L14.8594 10.7472L3.33203 10.7472C2.91782 10.7472 2.58203 10.4114 2.58203 9.99715C2.58203 9.58294 2.91782 9.24715 3.33203 9.24715L14.854 9.24715L11.1393 5.53016C10.8465 5.23717 10.8467 4.7623 11.1397 4.4695C11.4327 4.1767 11.9075 4.17685 12.2003 4.46984L17.1578 9.43049C17.3163 9.568 17.4165 9.77087 17.4165 9.99715C17.4165 9.99763 17.4165 9.99812 17.4165 9.9986Z"
                      fill=""
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* A saved scan lands in receipts, and useReceipts' realtime subscription
          drops it into the table above without a reload. */}
      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
    </>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Fuel, Package, Pill, Receipt, ShoppingCart, Utensils, Zap, type LucideIcon } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { SensitiveValue } from '../../components/SensitiveValue'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/Table'
import type { InstallmentPlan } from '../../lib/types'
import type { AnalyticsResult, RecentPurchase } from './types'

/**
 * Cloned from the TailAdmin ecommerce demo's `RecentOrders`
 * (`…/free-react-tailwind-admin-dashboard-main/src/components/ecommerce/RecentOrders.tsx`).
 * Wrapper, header, both buttons with their inline SVG, the table wrapper and
 * every header cell keep the source's class strings exactly.
 *
 * Divergences from the source, all deliberate:
 *  - Its `tableData` const of five sample products is gone entirely. Rows come
 *    from `computeRecentPurchases`, i.e. the user's own receipt lines.
 *  - The source renders a 50x50 `<img src="/images/product/*.jpg">`. Tend has
 *    no product photography and will not invent any, so the same 50x50
 *    `overflow-hidden rounded-md` box holds a category icon instead.
 *  - Its Category and Price cells are transposed relative to its own header
 *    row (the header reads Products/Category/Price/Status, the body renders
 *    price before category). That is a bug in the template; it is fixed here
 *    rather than cloned, because a money column under a "Category" heading is
 *    actively misleading in a finance app.
 *  - "Orders" becomes "Purchases" throughout — these are things bought, not
 *    orders fulfilled.
 */

const HEADER_CELL = 'py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400'
const BODY_CELL = 'py-3 text-gray-500 text-theme-sm dark:text-gray-400'
const BUTTON =
  'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200'

/** Icon for the 50x50 tile, chosen from the category then the item wording.
 *  Purely presentational — it never changes a number. */
function iconFor(purchase: RecentPurchase): LucideIcon {
  const hay = `${purchase.categoryName ?? ''} ${purchase.label}`.toLowerCase()
  if (/fuel|octane|petrol|gas|benzin/.test(hay)) return Fuel
  if (/pharmac|prescription|medicine|first-aid|drug/.test(hay)) return Pill
  if (/grocer|produce|bakery|pantry|milk|food/.test(hay)) return ShoppingCart
  if (/dining|restaurant|cafe|coffee/.test(hay)) return Utensils
  if (/transport|taxi|uber|car/.test(hay)) return Car
  if (/utilit|electric|water|internet|bill/.test(hay)) return Zap
  return Package
}

/** Money in this table is always two decimals — `formatCurrency` defaults to
 *  minimumFractionDigits 0, which is right for the stat cards but reads as a
 *  typo in a column of line totals. Local, so the shared helper's callers on
 *  ExpensesPage are untouched. */
function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusBadge({ plan }: { plan: InstallmentPlan | undefined }) {
  if (!plan) return <Badge color="success" size="sm">Paid</Badge>
  if (plan.status === 'completed') return <Badge color="success" size="sm">Settled</Badge>
  if (plan.status === 'late') return <Badge color="error" size="sm">Overdue</Badge>
  if (plan.status === 'cancelled') return <Badge color="light" size="sm">Cancelled</Badge>
  return (
    <Badge color="warning" size="sm">
      Installment · {plan.months}m
    </Badge>
  )
}

export function RecentPurchases({
  purchases,
  plansByExpenseId,
}: {
  purchases: AnalyticsResult<{ purchases: RecentPurchase[] }>
  /** Empty until the installments migration is applied; every row then reads
   *  "Paid", which is the truth when no plan is on record. */
  plansByExpenseId?: Map<string, InstallmentPlan>
}) {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')

  // Memoised because `purchases` is a fresh result object on every analytics
  // reload; without this the two useMemos below re-run on every render.
  const rows = useMemo(() => (purchases.status === 'ok' ? purchases.purchases : []), [purchases])

  const categories = useMemo(() => {
    const names = new Set<string>()
    for (const row of rows) if (row.categoryName) names.add(row.categoryName)
    return [...names].sort()
  }, [rows])

  const visible = useMemo(
    () => (category ? rows.filter((r) => r.categoryName === category) : rows),
    [rows, category],
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Purchases</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* The source's Filter button is a dead control. Wired to a real
              category filter rather than shipped inert; the SVG is its own. */}
          <label className={`${BUTTON} cursor-pointer`}>
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2.29004 5.90393H17.7067" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17.7075 14.0961H2.29085" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
              <path
                d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
            </svg>
            Filter
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter purchases by category"
              className="ml-1 bg-transparent text-theme-sm outline-hidden"
            >
              <option value="">All</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => navigate('/expenses')} className={BUTTON}>
            See all
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={rows.length === 0 ? 'No itemised purchases yet' : 'Nothing in this category'}
          description={
            rows.length === 0 ? 'Scan a receipt to see its individual items here.' : 'Try a different category filter.'
          }
        />
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className={HEADER_CELL}>
                  Products
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  Category
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  Price
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visible.map((purchase) => {
                const Icon = iconFor(purchase)
                const plan = purchase.expenseId ? plansByExpenseId?.get(purchase.expenseId) : undefined
                return (
                  <TableRow key={purchase.id}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                          <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{purchase.label}</p>
                          <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                            {purchase.merchantName ?? 'Unknown merchant'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={BODY_CELL}>{purchase.categoryName ?? '—'}</TableCell>
                    <TableCell className={BODY_CELL}>
                      <SensitiveValue>{money(purchase.lineTotal, purchase.currency)}</SensitiveValue>
                    </TableCell>
                    <TableCell className={BODY_CELL}>
                      <StatusBadge plan={plan} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

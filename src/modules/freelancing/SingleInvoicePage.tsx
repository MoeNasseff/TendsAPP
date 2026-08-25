import { Link, useSearchParams } from 'react-router-dom'
import { PageBreadcrumb } from '../../components/PageBreadcrumb'
import { PageSkeleton } from '../../components/PageSkeleton'
import { useProfile } from '../../hooks/useProfile'
import { formatCurrency, formatDate } from '../../lib/format'
import { DEMO_ID_PREFIX, findDemoReceipt } from './invoice-data'
import { displayNumber, useReceipt } from '../expenses/useReceipts'

/**
 * Clone of https://demo.tailadmin.com/single-invoice, transcribed from
 * `assets/re-desgin/tailadmin-pro-reference/single-invoice.html`
 * (lines 2878-3235).
 *
 * The reference page is fully static — no Alpine state at all beyond the
 * breadcrumb's `pageName` — so this is a straight markup transcription with
 * `class` → `className` and the self-closing/attribute casing React needs.
 *
 * Its markup quirks are preserved rather than tidied, so the two still diff
 * cleanly — notably the "Products" column head being `text-xs … text-gray-500`
 * while every other head is `text-sm … text-gray-700`.
 *
 * Two content divergences, both because the data is now real: the summary's
 * hardcoded "Vat (10%)" label became "Tax" (the rate is whatever the document
 * carries, and asserting 10% would be wrong), and a "Scanned document" panel
 * was added below the line items.
 *
 * The content is the receipt named by `?id=`, loaded from public.receipts with
 * its line items. From/To are inverted relative to the reference on purpose: it
 * bills a customer, so From is the sender; a scanned receipt was issued *to*
 * you, so From is the merchant and To is your profile.
 *
 * Stubs: "Proceed to payment" and "Print" are inert — theirs are too.
 */
export function SingleInvoicePage() {
  const [params] = useSearchParams()
  const id = params.get('id')
  // Demo rows carry a `demo-` id and resolve from the sample data instead of
  // Supabase, so clicking one opens a coherent invoice rather than not-found.
  const demo = id?.startsWith(DEMO_ID_PREFIX) ? findDemoReceipt(id) : null
  const { receipt: real, loading } = useReceipt(demo ? null : id)
  const receipt = demo ?? real
  const { profile } = useProfile()

  if (loading && !demo) return <PageSkeleton />

  if (!receipt) {
    return (
      <>
        <PageBreadcrumb pageName="Invoice" />
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            That invoice could not be found.{' '}
            <Link to="/invoices" className="text-brand-500 hover:underline">
              Back to invoices
            </Link>
          </p>
        </div>
      </>
    )
  }

  const currency = receipt.currency
  const items = receipt.receipt_items
  const money = (n: number | null | undefined) => (n == null ? '—' : formatCurrency(n, currency))
  // Fall back to summing the lines when extraction produced no subtotal; a
  // zero sum means there were no line totals at all, which reads as unknown
  // rather than as a genuine zero.
  const summedLines = items.reduce((sum, i) => sum + (i.line_total ?? 0), 0)
  const subtotal = receipt.subtotal ?? (summedLines || null)

  return (
    <>
      <PageBreadcrumb pageName="Invoice" />

      <div>
        <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="text-theme-xl font-medium text-gray-800 dark:text-white/90">Invoice</h3>

            <h4 className="text-base font-medium text-gray-700 dark:text-gray-400">
              ID : {displayNumber(receipt)}
            </h4>
          </div>

          <div className="p-5 xl:p-8">
            <div className="mb-9 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  From
                </span>

                <h5 className="mb-2 text-base font-semibold text-gray-800 dark:text-white/90">
                  {receipt.merchant_name ?? 'Unknown merchant'}
                </h5>

                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  {receipt.document_type
                    ? receipt.document_type[0].toUpperCase() + receipt.document_type.slice(1)
                    : 'Receipt'}
                  <br />
                  Scanned {formatDate(receipt.created_at)}
                </p>

                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Issued On:
                </span>

                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(receipt.issued_at)}
                </span>
              </div>

              <div className="h-px w-full bg-gray-200 sm:h-[158px] sm:w-px dark:bg-gray-800"></div>

              <div className="sm:text-right">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  To
                </span>

                <h5 className="mb-2 text-base font-semibold text-gray-800 dark:text-white/90">
                  {profile.display_name?.trim() || 'You'}
                </h5>

                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  {items.length} {items.length === 1 ? 'line item' : 'line items'} <br />
                  {receipt.extraction_source === 'ai'
                    ? 'Extracted by AI'
                    : receipt.extraction_source === 'manual'
                      ? 'Entered manually'
                      : 'Extracted automatically'}
                </p>

                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Due On:
                </span>

                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(receipt.due_at)}
                </span>
              </div>
            </div>

            {/* Invoice Table Start */}
            <div>
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="min-w-full text-left text-gray-700 dark:text-gray-400">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400">
                        S.No.#
                      </th>
                      <th className="px-5 py-3 text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                        Products
                      </th>
                      <th className="px-5 py-3 text-center text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400">
                        Quantity
                      </th>
                      <th className="px-5 py-3 text-center text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400">
                        Unit Cost
                      </th>
                      <th className="px-5 py-3 text-center text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400">
                        Discount
                      </th>
                      <th className="px-5 py-3 text-right text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium whitespace-nowrap text-gray-800 dark:text-white/90">
                          {item.label}
                        </td>
                        <td className="px-5 py-3 text-center text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {item.quantity ?? 1}
                        </td>
                        <td className="px-5 py-3 text-center text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {money(item.unit_price)}
                        </td>
                        <td className="px-5 py-3 text-center text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {item.discount ? `${item.discount}%` : '0%'}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                          {money(item.line_total)}
                        </td>
                      </tr>
                    ))}
                    {/* Ours — extraction does not always produce line items,
                        and the reference has no empty state for this table. */}
                    {items.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          No line items were extracted from this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Invoice Table End */}

            {/* Ours — the reference has no image slot, but the whole point of a
                scanned record is being able to check it against the original. */}
            {receipt.image_url && (
              <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    Scanned document
                  </span>
                </div>
                <a href={receipt.image_url} target="_blank" rel="noreferrer" className="block bg-gray-50 p-4 dark:bg-white/[0.02]">
                  <img
                    src={receipt.image_url}
                    alt={`Scan of ${displayNumber(receipt)}`}
                    className="mx-auto max-h-[520px] w-auto rounded-lg object-contain"
                  />
                </a>
              </div>
            )}

            <div className="my-6 flex justify-end border-b border-gray-100 pb-6 text-right dark:border-gray-800">
              <div className="w-[220px]">
                <p className="mb-4 text-left text-sm font-medium text-gray-800 dark:text-white/90">
                  Order summary
                </p>
                <ul className="space-y-2">
                  <li className="flex justify-between gap-5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Sub Total</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                      {money(subtotal)}
                    </span>
                  </li>
                  {/* Their label hardcodes "Vat (10%)". Ours reports the tax the
                      document actually carries, so the rate is not asserted. */}
                  <li className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Tax:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                      {money(receipt.tax)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 dark:text-gray-400">Total</span>
                    <span className="text-lg font-semibold text-gray-800 dark:text-white/90">
                      {money(receipt.total)}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {/* Stub — no payment flow yet. */}
              <button className="shadow-theme-xs flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                Proceed to payment
              </button>

              {/* Stub — theirs is inert too; no print handler in the reference. */}
              <button className="bg-brand-500 shadow-theme-xs hover:bg-brand-600 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white">
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
                    d="M6.99578 4.08398C6.58156 4.08398 6.24578 4.41977 6.24578 4.83398V6.36733H13.7542V5.62451C13.7542 5.42154 13.672 5.22724 13.5262 5.08598L12.7107 4.29545C12.5707 4.15983 12.3835 4.08398 12.1887 4.08398H6.99578ZM15.2542 6.36902V5.62451C15.2542 5.01561 15.0074 4.43271 14.5702 4.00891L13.7547 3.21839C13.3349 2.81151 12.7733 2.58398 12.1887 2.58398H6.99578C5.75314 2.58398 4.74578 3.59134 4.74578 4.83398V6.36902C3.54391 6.41522 2.58374 7.40415 2.58374 8.61733V11.3827C2.58374 12.5959 3.54382 13.5848 4.74561 13.631V15.1665C4.74561 16.4091 5.75297 17.4165 6.99561 17.4165H13.0041C14.2467 17.4165 15.2541 16.4091 15.2541 15.1665V13.6311C16.456 13.585 17.4163 12.596 17.4163 11.3827V8.61733C17.4163 7.40414 16.4561 6.41521 15.2542 6.36902ZM4.74561 11.6217V12.1276C4.37292 12.084 4.08374 11.7671 4.08374 11.3827V8.61733C4.08374 8.20312 4.41953 7.86733 4.83374 7.86733H15.1663C15.5805 7.86733 15.9163 8.20312 15.9163 8.61733V11.3827C15.9163 11.7673 15.6269 12.0842 15.2541 12.1277V11.6217C15.2541 11.2075 14.9183 10.8717 14.5041 10.8717H5.49561C5.08139 10.8717 4.74561 11.2075 4.74561 11.6217ZM6.24561 12.3717V15.1665C6.24561 15.5807 6.58139 15.9165 6.99561 15.9165H13.0041C13.4183 15.9165 13.7541 15.5807 13.7541 15.1665V12.3717H6.24561Z"
                    fill=""
                  />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

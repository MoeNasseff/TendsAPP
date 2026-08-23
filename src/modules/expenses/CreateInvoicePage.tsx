import { useState } from 'react'
import { PageBreadcrumb } from '../../components/PageBreadcrumb'

/**
 * Clone of https://demo.tailadmin.com/create-invoice, transcribed from
 * `assets/re-desgin/tailadmin-pro-reference/create-invoice.html`
 * (lines 2878-3601), including its `invoiceProducts()` Alpine component.
 *
 * Translated the same way as InvoicesPage: `x-data` → hooks, `x-model` →
 * controlled inputs, `x-for` → `.map`, `x-text` → expression. Every class,
 * label, placeholder, option and SVG is the reference's.
 *
 * Two knowing divergences, both disclosed rather than silent:
 *   - Their "Preview Invoice" button toggles `isModalOpen`, which is not
 *     declared in that scope — it is dead in the reference too. Left inert.
 *   - Their per-row trash glyph has `cursor-pointer` and a hover colour but no
 *     handler at all. Wired here to drop the row, since that needs no backend
 *     and no decision; say the word and it goes back to inert.
 *
 * Stubs pending the backend pass: every field in the top form is uncontrolled,
 * and "Save Invoice" does nothing. The product table below it is fully working
 * local state, exactly as the reference's is.
 */

interface Product {
  name: string
  price: number
  quantity: number
  discount: number
  total: string
}

const INITIAL_PRODUCTS: Product[] = [
  { name: 'Macbook pro 13”', price: 1200, quantity: 1, discount: 0, total: (1200 * 1).toFixed(2) },
  { name: 'Apple Watch Ultra', price: 300, quantity: 1, discount: 50, total: (300 * 1 * 0.5).toFixed(2) },
  { name: 'iPhone 15 Pro Max', price: 800, quantity: 2, discount: 0, total: (800 * 2).toFixed(2) },
  { name: 'iPad Pro 3rd Gen', price: 900, quantity: 1, discount: 0, total: (900 * 1).toFixed(2) },
]

const field =
  'dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const selectField =
  'dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pr-11 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const dateField =
  'dark:bg-dark-900 datepickerTwo shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pr-11 pl-4 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
const optionClass = 'text-gray-700 dark:bg-gray-900 dark:text-gray-400'
const addLabel = 'mb-1 inline-block text-sm font-semibold text-gray-700 dark:text-gray-400'
const addField =
  'dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const th = 'px-5 py-4 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400'
const td = 'px-5 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400'

/** Their chevron, shared by both selects. */
function SelectChevron() {
  return (
    <span className="pointer-events-none absolute top-1/2 right-4 z-30 -translate-y-1/2 text-gray-700 dark:text-gray-400">
      <svg
        className="stroke-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
          stroke=""
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/** Their calendar glyph, shared by both date fields. */
function CalendarGlyph() {
  return (
    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-400">
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
          d="M6.66659 1.5415C7.0808 1.5415 7.41658 1.87729 7.41658 2.2915V2.99984H12.5833V2.2915C12.5833 1.87729 12.919 1.5415 13.3333 1.5415C13.7475 1.5415 14.0833 1.87729 14.0833 2.2915V2.99984L15.4166 2.99984C16.5212 2.99984 17.4166 3.89527 17.4166 4.99984V7.49984V15.8332C17.4166 16.9377 16.5212 17.8332 15.4166 17.8332H4.58325C3.47868 17.8332 2.58325 16.9377 2.58325 15.8332V7.49984V4.99984C2.58325 3.89527 3.47868 2.99984 4.58325 2.99984L5.91659 2.99984V2.2915C5.91659 1.87729 6.25237 1.5415 6.66659 1.5415ZM6.66659 4.49984H4.58325C4.30711 4.49984 4.08325 4.7237 4.08325 4.99984V6.74984H15.9166V4.99984C15.9166 4.7237 15.6927 4.49984 15.4166 4.49984H13.3333H6.66659ZM15.9166 8.24984H4.08325V15.8332C4.08325 16.1093 4.30711 16.3332 4.58325 16.3332H15.4166C15.6927 16.3332 15.9166 16.1093 15.9166 15.8332V8.24984Z"
          fill=""
        />
      </svg>
    </span>
  )
}

export function CreateInvoicePage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [form, setForm] = useState({ name: '', price: 0, quantity: 1, discount: 0 })

  function addProduct() {
    if (!form.name || form.price <= 0 || form.quantity <= 0) return
    const discountAmount = form.price * form.quantity * (form.discount / 100)
    const total = form.price * form.quantity - discountAmount
    setProducts((prev) => [...prev, { ...form, total: total.toFixed(2) }])
    setForm({ name: '', price: 0, quantity: 1, discount: 0 })
  }

  const subtotal = products.reduce((sum, p) => sum + parseFloat(p.total), 0).toFixed(2)
  const vat = (parseFloat(subtotal) * 0.1).toFixed(2)
  const total = (parseFloat(subtotal) + parseFloat(vat)).toFixed(2)

  return (
    <>
      <PageBreadcrumb pageName="Create Invoice" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-xl font-medium text-gray-800 dark:text-white">Create Invoice</h2>
        </div>

        <div className="border-b border-gray-200 p-4 sm:p-8 dark:border-gray-800">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="invoice-number" className={labelClass}>
                  Invoice Number
                </label>
                <input type="text" id="invoice-number" className={field} placeholder="WP-3434434" />
              </div>
              <div>
                <label htmlFor="customer-name" className={labelClass}>
                  Customer Name
                </label>
                <input type="text" id="customer-name" className={field} placeholder="Jhon Deniyal" />
              </div>
              <div className="col-span-full">
                <label htmlFor="customer-address" className={labelClass}>
                  Customer Address
                </label>
                <input
                  type="text"
                  id="customer-address"
                  className={field}
                  placeholder="Enter customer address"
                />
              </div>
              <div>
                <label className={labelClass}>Payment Condition</label>
                <div className="relative z-20 bg-transparent">
                  <select className={selectField} defaultValue="">
                    <option value="" className={optionClass}>
                      Select Payment Condition
                    </option>
                    <option value="net-7" className={optionClass}>
                      Net 7 Days
                    </option>
                    <option value="net-15" className={optionClass}>
                      Net 15 Days
                    </option>
                    <option value="net-30" className={optionClass}>
                      Net 30 Days
                    </option>
                    <option value="net-60" className={optionClass}>
                      Net 60 Days
                    </option>
                    <option value="net-90" className={optionClass}>
                      Net 90 Days
                    </option>
                    <option value="due-on-receipt" className={optionClass}>
                      Due on Receipt
                    </option>
                    <option value="cash-on-delivery" className={optionClass}>
                      Cash on Delivery (COD)
                    </option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <div className="relative z-20 bg-transparent">
                  <select className={selectField} defaultValue="">
                    <option value="" className={optionClass}>
                      Select Currency
                    </option>
                    <option value="usd" className={optionClass}>
                      United States Dollar (USD)
                    </option>
                    <option value="eur" className={optionClass}>
                      Euro (EUR)
                    </option>
                    <option value="gbp" className={optionClass}>
                      British Pound (GBP)
                    </option>
                    <option value="jpy" className={optionClass}>
                      Japanese Yen (JPY)
                    </option>
                    <option value="cad" className={optionClass}>
                      Canadian Dollar (CAD)
                    </option>
                    <option value="aud" className={optionClass}>
                      Australian Dollar (AUD)
                    </option>
                    <option value="chf" className={optionClass}>
                      Swiss Franc (CHF)
                    </option>
                    <option value="cny" className={optionClass}>
                      Chinese Yuan (CNY)
                    </option>
                    <option value="inr" className={optionClass}>
                      Indian Rupee (INR)
                    </option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div>
                <label className={labelClass}>Issue Date</label>

                <div className="relative">
                  <input type="date" placeholder="Select date" className={dateField} />
                  <CalendarGlyph />
                </div>
              </div>
              <div>
                <label className={labelClass}>Due Date</label>

                <div className="relative">
                  <input type="date" placeholder="Select date" className={dateField} />
                  <CalendarGlyph />
                </div>
              </div>
              <div className="col-span-full">
                <label className={labelClass}>Additional Info</label>
                <textarea
                  placeholder="Receipt Info (optional)"
                  rows={7}
                  className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 w-full resize-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                ></textarea>
              </div>
            </div>
          </form>
        </div>

        <div className="border-b border-gray-200 p-4 sm:p-8 dark:border-gray-800">
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="custom-scrollbar overflow-x-auto">
              <table className="min-w-full text-left text-sm text-gray-700 dark:border-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr className="border-b border-gray-100 whitespace-nowrap dark:border-gray-800">
                    <th className={th}>S. No.</th>
                    <th className="px-5 py-4 text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                      Products
                    </th>
                    <th className={th}>Quantity</th>
                    <th className={th}>Unit Cost</th>
                    <th className={th}>Discount</th>
                    <th className={th}>Total</th>
                    <th className="relative px-5 py-4 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-white/[0.03]">
                  {products.map((product, idx) => (
                    <tr key={idx}>
                      <td className={td}>{idx + 1}</td>
                      <td className="px-5 py-4 text-sm font-medium whitespace-nowrap text-gray-800 dark:text-white/90">
                        {product.name}
                      </td>
                      <td className={td}>{product.quantity}</td>
                      <td className={td}>{'$' + product.price}</td>
                      <td className={td}>{product.discount + '%'}</td>
                      <td className={td}>{'$' + product.total}</td>
                      <td className={td}>
                        <div className="flex items-center justify-center">
                          <svg
                            onClick={() => setProducts((prev) => prev.filter((_, i) => i !== idx))}
                            className="hover:fill-error-500 dark:hover:fill-error-500 cursor-pointer fill-gray-700 dark:fill-gray-400"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M6.54142 3.7915C6.54142 2.54886 7.54878 1.5415 8.79142 1.5415H11.2081C12.4507 1.5415 13.4581 2.54886 13.4581 3.7915V4.0415H15.6252H16.666C17.0802 4.0415 17.416 4.37729 17.416 4.7915C17.416 5.20572 17.0802 5.5415 16.666 5.5415H16.3752V8.24638V13.2464V16.2082C16.3752 17.4508 15.3678 18.4582 14.1252 18.4582H5.87516C4.63252 18.4582 3.62516 17.4508 3.62516 16.2082V13.2464V8.24638V5.5415H3.3335C2.91928 5.5415 2.5835 5.20572 2.5835 4.7915C2.5835 4.37729 2.91928 4.0415 3.3335 4.0415H4.37516H6.54142V3.7915ZM14.8752 13.2464V8.24638V5.5415H13.4581H12.7081H7.29142H6.54142H5.12516V8.24638V13.2464V16.2082C5.12516 16.6224 5.46095 16.9582 5.87516 16.9582H14.1252C14.5394 16.9582 14.8752 16.6224 14.8752 16.2082V13.2464ZM8.04142 4.0415H11.9581V3.7915C11.9581 3.37729 11.6223 3.0415 11.2081 3.0415H8.79142C8.37721 3.0415 8.04142 3.37729 8.04142 3.7915V4.0415ZM8.3335 7.99984C8.74771 7.99984 9.0835 8.33562 9.0835 8.74984V13.7498C9.0835 14.1641 8.74771 14.4998 8.3335 14.4998C7.91928 14.4998 7.5835 14.1641 7.5835 13.7498V8.74984C7.5835 8.33562 7.91928 7.99984 8.3335 7.99984ZM12.4168 8.74984C12.4168 8.33562 12.081 7.99984 11.6668 7.99984C11.2526 7.99984 10.9168 8.33562 10.9168 8.74984V13.7498C10.9168 14.1641 11.2526 14.4998 11.6668 14.4998C12.081 14.4998 12.4168 14.1641 12.4168 13.7498V8.74984Z"
                              fill=""
                            />
                          </svg>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 0 && (
                <div className="px-5 py-4 text-center text-gray-400">No products added.</div>
              )}
            </div>
          </div>

          {/* Add Form */}
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addProduct()
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-12">
                <div className="w-full lg:col-span-3">
                  <label className={addLabel}>Product Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Enter product name"
                    className={addField}
                    required
                  />
                </div>
                <div className="w-full lg:col-span-3">
                  <label className={addLabel}>Price</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    min="0"
                    placeholder="Enter product price"
                    className={addField}
                    required
                  />
                </div>
                <div className="w-full lg:col-span-2">
                  <label className={addLabel}>Quantity</label>
                  <div className="flex h-11 divide-x divide-gray-300 overflow-hidden rounded-lg border border-gray-300 dark:divide-gray-800 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                      className="inline-flex w-1/3 items-center justify-center bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                      aria-label="Decrease quantity"
                    >
                      <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M6.66699 12H18.6677"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <div className="w-1/3">
                      <input
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                        className="h-full w-full border-0 bg-white text-center text-sm text-gray-700 outline-none focus:ring-0 dark:bg-gray-900 dark:text-gray-400"
                        aria-label="Quantity"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, quantity: f.quantity + 1 }))}
                      className="inline-flex w-1/3 items-center justify-center bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                      aria-label="Increase quantity"
                    >
                      <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M6.66699 12.0002H18.6677M12.6672 6V18.0007"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="w-full lg:col-span-2">
                  <label className={addLabel}>Discount</label>
                  <select
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) }))}
                    className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    aria-label="Discount"
                  >
                    <option value="0">0%</option>
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                    <option value="50">50%</option>
                  </select>
                </div>
                <div className="flex w-full items-end lg:col-span-2">
                  <button
                    type="submit"
                    className="hover:bg-brand-600 bg-brand-500 h-11 w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition"
                  >
                    Save Product
                  </button>
                </div>
              </div>
            </form>
            <div className="mt-5 flex max-w-2xl items-center gap-2">
              <svg
                className="text-gray-500 dark:text-gray-400"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 7.22485H10.0007"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.0004 9.34575V12.8661M17.7087 10.0001C17.7087 14.2573 14.2575 17.7084 10.0003 17.7084C5.74313 17.7084 2.29199 14.2573 2.29199 10.0001C2.29199 5.74289 5.74313 2.29175 10.0003 2.29175C14.2575 2.29175 17.7087 5.74289 17.7087 10.0001Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                After filling in the product details, press Enter/Return or click 'Save Product' to
                add it to the list.
              </p>
            </div>
          </div>

          {/* Total Summary */}
          <div className="flex flex-wrap justify-between sm:justify-end">
            <div className="mt-6 w-full space-y-1 text-right sm:w-[220px]">
              <p className="mb-4 text-left text-sm font-medium text-gray-800 dark:text-white/90">
                Order summary
              </p>
              <ul className="space-y-2">
                <li className="flex justify-between gap-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sub Total</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    {'$' + subtotal}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Vat (10%):</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    {'$' + vat}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-400">Total</span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {'$' + total}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {/* Stub — theirs toggles an isModalOpen that is not in scope. */}
            <button className="shadow-theme-xs inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M2.46585 10.7925C2.23404 10.2899 2.23404 9.71023 2.46585 9.20764C3.78181 6.35442 6.66064 4.375 10.0003 4.375C13.3399 4.375 16.2187 6.35442 17.5347 9.20765C17.7665 9.71024 17.7665 10.2899 17.5347 10.7925C16.2187 13.6458 13.3399 15.6252 10.0003 15.6252C6.66064 15.6252 3.78181 13.6458 2.46585 10.7925Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.0212 10C13.0212 11.6684 11.6687 13.0208 10.0003 13.0208C8.33196 13.0208 6.97949 11.6684 6.97949 10C6.97949 8.33164 8.33196 6.97917 10.0003 6.97917C11.6687 6.97917 13.0212 8.33164 13.0212 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Preview Invoice
            </button>
            {/* Stub — no invoice record to save to yet. */}
            <button className="bg-brand-500 shadow-theme-xs hover:bg-brand-600 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M13.333 16.6666V12.9166C13.333 12.2262 12.7734 11.6666 12.083 11.6666L7.91634 11.6666C7.22599 11.6666 6.66634 12.2262 6.66634 12.9166L6.66635 16.6666M9.99967 5.83325H6.66634M15.4163 16.6666H4.58301C3.89265 16.6666 3.33301 16.1069 3.33301 15.4166V4.58325C3.33301 3.8929 3.89265 3.33325 4.58301 3.33325H12.8171C13.1483 3.33325 13.4659 3.46468 13.7003 3.69869L16.2995 6.29384C16.5343 6.52832 16.6662 6.84655 16.6662 7.17841L16.6663 15.4166C16.6663 16.1069 16.1066 16.6666 15.4163 16.6666Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Save Invoice
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

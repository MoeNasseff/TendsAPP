import { Link } from 'react-router-dom'

/**
 * Port of TailAdmin's SidebarWidget — the box that closes out element 1, kept
 * so the sidebar's trailing `pb-20` still has the thing it was padding.
 *
 * Their chrome verbatim: the `max-w-60` rounded-2xl panel, the heading/body
 * pair, and the full-width brand-500 CTA. The copy is Tend's — theirs sells the
 * TailAdmin template, which would be an advert for someone else's product
 * sitting inside this app's navigation.
 */
export function SidebarWidget() {
  return (
    <div className="pb-20">
      <div className="mx-auto w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
        <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Snap a receipt</h3>
        <p className="mb-4 text-theme-sm text-gray-500 dark:text-gray-400">
          Scan a bill and Tend fills in the amount, date and category for you.
        </p>
        <Link
          to="/expenses"
          className="flex items-center justify-center rounded-lg bg-brand-500 p-3 text-theme-sm font-medium text-white hover:bg-brand-600"
        >
          Add expense
        </Link>
      </div>
    </div>
  )
}

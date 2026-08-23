import { Link } from 'react-router-dom'

/**
 * Clone of TailAdmin's breadcrumb partial, transcribed from
 * `assets/re-desgin/tailadmin-pro-reference/invoices.html` (lines 2877-2916).
 *
 * Their Alpine version holds the title in `x-data="{ pageName: 'Invoices' }"`
 * and prints it twice via `x-text`; here it is a prop printed twice. Every
 * class, the 17x16 chevron and the "Home" label are unchanged, and the crumb
 * link points at `/` rather than their `index.html`.
 */
export function PageBreadcrumb({ pageName }: { pageName: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{pageName}</h2>
        <nav>
          <ol className="flex items-center gap-1.5">
            <li>
              <Link
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
                to="/"
              >
                Home
                <svg
                  className="stroke-current"
                  width="17"
                  height="16"
                  viewBox="0 0 17 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                    stroke=""
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </li>
            <li className="text-sm text-gray-800 dark:text-white/90">{pageName}</li>
          </ol>
        </nav>
      </div>
    </div>
  )
}

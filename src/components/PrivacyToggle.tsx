import { usePrivacy } from '../hooks/usePrivacy'

/**
 * The hide/show-amounts control, extracted from Header so it can sit beside a
 * page title instead of in the global bar.
 *
 * `sensitive` values exist on more than one page (Expenses and Body), so if a
 * page shows them it needs one of these — there is no longer a global control
 * to fall back on. Drop `<PrivacyToggle />` next to that page's title.
 */
export function PrivacyToggle({ className = '' }: { className?: string }) {
  const { hidden, toggle } = usePrivacy()

  return (
    <button
      type="button"
      onClick={toggle}
      title={hidden ? 'Show amounts' : 'Hide amounts'}
      aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
      aria-pressed={hidden}
      className={`tap-target rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300 ${className}`}
    >
      {hidden ? (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.22 2.22a.75.75 0 0 1 1.06 0l18.5 18.5a.75.75 0 1 1-1.06 1.06l-3.2-3.2A11.2 11.2 0 0 1 12 20c-5 0-9.27-3.11-11-8a12.4 12.4 0 0 1 4.06-5.38L2.22 3.28a.75.75 0 0 1 0-1.06Zm4.92 5.98A10.9 10.9 0 0 0 2.64 12c1.6 3.9 5.2 6.5 9.36 6.5 1.6 0 3.12-.39 4.46-1.08l-2.2-2.2a4 4 0 0 1-5.48-5.48L7.14 8.2Zm3.02 3.02a2.5 2.5 0 0 0 3.32 3.32l-3.32-3.32ZM12 5.5c-.9 0-1.78.12-2.6.34L8.2 4.64A12.3 12.3 0 0 1 12 4c5 0 9.27 3.11 11 8a12.5 12.5 0 0 1-3.1 4.5l-1.07-1.07A11 11 0 0 0 21.36 12C19.76 8.1 16.16 5.5 12 5.5Z" />
        </svg>
      ) : (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4c5 0 9.27 3.11 11 8-1.73 4.89-6 8-11 8s-9.27-3.11-11-8c1.73-4.89 6-8 11-8Zm0 1.5C7.84 5.5 4.24 8.1 2.64 12c1.6 3.9 5.2 6.5 9.36 6.5s7.76-2.6 9.36-6.5C19.76 8.1 16.16 5.5 12 5.5ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
        </svg>
      )}
    </button>
  )
}

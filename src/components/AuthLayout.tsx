import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { GridShape } from './GridShape'
import { useBrand } from '../hooks/useBrand'
import { useTheme } from '../hooks/useTheme'

/**
 * Port of TailAdmin's AuthPageLayout (pages/AuthPages/AuthPageLayout.tsx).
 *
 * This exists because /login and /signup were drifting: the brand panel was
 * inlined in Login, so a second copy in Signup would only ever be "close".
 * TailAdmin renders the panel exactly once and has both auth pages consume it,
 * which is what makes the two screens identical by construction rather than by
 * two blocks of markup being kept in sync by hand.
 *
 * Everything structural here is theirs. Ours are the logo, the tagline, and the
 * theme store the toggle writes to.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const brand = useBrand()
  const { effective, setTheme } = useTheme()

  return (
    <div className="relative z-1 bg-white p-6 dark:bg-gray-900 sm:p-0">
      <div className="relative flex h-screen w-full flex-col justify-center dark:bg-gray-900 sm:p-0 lg:flex-row">
        {children}

        {/* ---- Brand panel ----
            `relative` belongs on this outer panel, not on the inner box.
            GridShape's two halves are `absolute`, so they anchor to the nearest
            positioned ancestor: put `relative` on the inner flex box and they
            anchor to something only as tall as the logo plus the tagline, which
            wraps them around the text instead of pinning them to the panel's
            corners. The vendored React AuthPageLayout.tsx has it on the inner
            box; the current TailAdmin markup has it here. This is the one that
            matches the live demo. */}
        <div className="relative hidden h-full w-full items-center bg-brand-950 dark:bg-white/5 lg:grid lg:w-1/2">
          {/* z-1 still applies without `relative` — this is a grid item, and
              z-index works on flex/grid children regardless of position. It is
              what keeps the logo above the -z-1 grid corners. */}
          <div className="z-1 flex items-center justify-center">
            <GridShape />
            <div className="flex max-w-xs flex-col items-center">
              {/* The <Link> carries `mb-4 block` and the <img> explicit
                  width/height, both as TailAdmin has them. Theirs renders at its
                  intrinsic 231×48; ours is 136×40, so 163×48 is the same 48px
                  height at our own aspect ratio, undistorted. Stating the
                  dimensions rather than using `h-12 w-auto` also reserves the
                  box before the SVG loads, so the panel does not reflow. */}
              <Link to="/" className="mb-4 block">
                <img width={163} height={48} src={brand.logo.src} alt={brand.logo.alt} />
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60">{brand.tagline}</p>
            </div>
          </div>
        </div>

        {/* TailAdmin's ThemeTogglerTwo. Auth screens sit outside the app shell
            and so cannot reach the header's theme control, which is why their
            layout carries its own. Wired to our theme store: it flips
            light↔dark and leaves 'system' to Settings → Appearance. */}
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <button
            type="button"
            onClick={() => setTheme(effective === 'dark' ? 'light' : 'dark')}
            aria-label={effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex size-14 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
          >
            {effective === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

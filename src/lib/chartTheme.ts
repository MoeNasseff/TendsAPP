/**
 * Recharts takes colours as inline styles, not class names, so these cannot be
 * expressed as Tailwind utilities and cannot be re-themed by CSS. They are read
 * from the live computed styles instead, which keeps them bound to the @theme
 * tokens in index.css and makes them follow light/dark automatically.
 *
 * Previously these were hardcoded dark literals duplicated from the old surface
 * ramp, with a comment asking whoever changed the ramp to remember to update
 * them by hand. That contract was never going to hold across a theme switch.
 */

/** Reads a CSS custom property off <html>. Falls back when called before the
 *  stylesheet is live (SSR-ish contexts, tests). */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function isDark(): boolean {
  if (typeof document === 'undefined') return true
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

/** Categorical series colours, ordered for maximum adjacent separation.
 *  Brand indigo leads; the rest are the status hues plus neutral steps, so a
 *  multi-series chart still reads as one system. */
export const CHART_SERIES: string[] = [
  '#465fff',
  '#12b76a',
  '#f79009',
  '#f04438',
  '#7a5af8',
  '#ee46bc',
  '#0ba5ec',
]

/** Shared <Tooltip> props. Called per render so a theme switch is picked up. */
export function tooltipProps() {
  const dark = isDark()
  return {
    contentStyle: {
      background: dark ? token('--color-gray-800', '#1d2939') : '#ffffff',
      border: `1px solid ${dark ? 'rgb(255 255 255 / 0.1)' : token('--color-gray-200', '#e4e7ec')}`,
      borderRadius: 12,
      boxShadow: dark
        ? 'none'
        : '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
      color: dark ? token('--color-gray-100', '#f2f4f7') : token('--color-gray-800', '#1d2939'),
      fontSize: 12,
    },
    labelStyle: {
      color: dark ? token('--color-gray-400', '#98a2b3') : token('--color-gray-500', '#667085'),
    },
    cursor: { fill: dark ? 'rgb(255 255 255 / 0.04)' : 'rgb(16 24 40 / 0.04)' },
  }
}

/** Shared axis props: tick fill/size, no axis line, no tick line. */
export function axisProps() {
  return {
    tick: {
      fontSize: 10,
      fill: isDark() ? token('--color-gray-500', '#667085') : token('--color-gray-400', '#98a2b3'),
    },
    axisLine: false,
    tickLine: false,
  }
}

/** CartesianGrid props: horizontal rules only. */
export function gridProps() {
  return {
    horizontal: true,
    vertical: false,
    stroke: isDark() ? 'rgb(255 255 255 / 0.05)' : token('--color-gray-200', '#e4e7ec'),
  }
}

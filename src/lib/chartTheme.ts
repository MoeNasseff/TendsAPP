/** Categorical series colours. Ordered for maximum adjacent separation. */
export const CHART_SERIES: string[] = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

// Values below are duplicated from index.css's surface ramp and motion tokens
// rather than read via getComputedStyle, since Recharts consumes these as
// inline styles, not Tailwind classes. Keep in sync with index.css if the
// ramp changes.

/** Shared <Tooltip> props — background/border read from the surface ramp. */
export const tooltipProps = {
  contentStyle: {
    background: 'rgb(25 28 29)', // --surface-low-rgb, index.css
    border: '1px solid rgb(255 255 255 / 0.1)',
    borderRadius: 12,
    boxShadow: 'none',
  },
  itemStyle: {
    color: 'rgb(255 255 255 / 0.85)',
  },
  labelStyle: {
    color: 'rgb(255 255 255 / 0.45)',
  },
  cursor: { fill: 'rgb(255 255 255 / 0.04)' },
}

/** Shared axis props: tick fill/size, no axis line, no tick line. */
export const axisProps = {
  tick: { fontSize: 10, fill: 'rgb(255 255 255 / 0.35)' },
  axisLine: false,
  tickLine: false,
}

/** CartesianGrid props: horizontal only, white/5, no vertical rules. */
export const gridProps = {
  horizontal: true,
  vertical: false,
  stroke: 'rgb(255 255 255 / 0.05)',
}

import type { ReactNode } from 'react'

/**
 * Statically-composed table primitives, ported from the TailAdmin reference
 * (`…/free-react-tailwind-admin-dashboard-main/src/components/ui/table/index.tsx`).
 *
 * Distinct from `DataGrid`, and not a replacement for it: `DataGrid` wraps
 * DataTables and owns sorting, search, paging and CSV export. These are dumb
 * elements for markup cloned from the template, where the row set is small and
 * already ordered by a compute function.
 *
 * Divergence: the reference interpolates an optional `className` with no
 * default, so it renders a literal `class="min-w-full  undefined"` (visible in
 * the template's own DOM). Defaulted to '' here — a stray `undefined` token
 * styles nothing and copying it would be cargo-culting rather than fidelity.
 */

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <table className={`min-w-full ${className}`}>{children}</table>
}

export function TableHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <thead className={className}>{children}</thead>
}

export function TableBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>
}

export function TableRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>
}

export function TableCell({
  children,
  isHeader = false,
  className = '',
}: {
  children: ReactNode
  isHeader?: boolean
  className?: string
}) {
  const Cell = isHeader ? 'th' : 'td'
  return <Cell className={className}>{children}</Cell>
}

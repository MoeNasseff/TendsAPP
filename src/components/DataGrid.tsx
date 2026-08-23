import { useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-dt'
import 'datatables.net-buttons-dt'
import 'datatables.net-buttons/js/buttons.html5.mjs'
import { SensitiveValue } from './SensitiveValue'

// Not a React hook — DataTable.use() registers the DataTables core library
// with the wrapper component, per datatables.net/manual/react.
// oxlint-disable-next-line react-hooks/rules-of-hooks
DataTable.use(DT)

export interface DataGridColumn<T> {
  /** Property name on the row. Also what DataTables sorts/searches by. */
  data: keyof T & string
  title: string
  /** Wraps the cell in <SensitiveValue> — for money/measurement columns. */
  sensitive?: boolean
  /** Display formatting. Sorting/search still use the raw `data` value. */
  format?: (value: T[keyof T], row: T) => string
  className?: string
}

const ACTIONS_COL = '__actions'

export function DataGrid<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  renderActions,
  pageLength = 10,
}: {
  columns: DataGridColumn<T>[]
  data: T[]
  /** Omit onEdit, onDelete, and renderActions for a read-only table — no actions column. */
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  /**
   * Full replacement for the actions cell — for pages that need more than
   * edit/delete (e.g. Dog's per-item reminder/mark-done buttons). When set,
   * onEdit/onDelete are ignored by DataGrid itself; wire them up inside the
   * returned node if still needed.
   */
  renderActions?: (row: T) => React.ReactNode
  pageLength?: number
}) {
  const hasActions = !!onEdit || !!onDelete || !!renderActions

  const dtColumns = useMemo(
    () => [
      ...columns.map((col) => ({
        data: col.data,
        title: col.title,
        name: col.data,
        className: col.className,
        render: col.sensitive
          ? undefined
          : (value: unknown, type: string, row: T) =>
              type === 'display' || type === 'filter'
                ? (col.format ? col.format(value as T[keyof T], row) : String(value ?? ''))
                : value,
      })),
      ...(hasActions
        ? [
            {
              data: null,
              name: ACTIONS_COL,
              title: '',
              orderable: false,
              searchable: false,
              className: 'dt-actions',
            },
          ]
        : []),
    ],
    [columns, hasActions],
  )

  const slots = useMemo(() => {
    const s: Record<string, (value: unknown, row: T) => React.JSX.Element> = {}
    if (renderActions) {
      s[ACTIONS_COL] = (_value, row) => <>{renderActions(row)}</>
    } else if (hasActions) {
      s[ACTIONS_COL] = (_value, row) => (
        <div className="flex justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(row)}
              aria-label="Edit"
              className="tap-target rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-brand-400"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(row)}
              aria-label="Delete"
              className="tap-target rounded-lg p-1.5 text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
    for (const col of columns) {
      if (col.sensitive) {
        s[col.data] = (value, row) => (
          <SensitiveValue>{col.format ? col.format(value as T[keyof T], row) : String(value ?? '')}</SensitiveValue>
        )
      }
    }
    return s
  }, [columns, onEdit, onDelete, renderActions, hasActions])

  return (
    <div className="dt-theme">
      <DataTable
        data={data}
        columns={dtColumns}
        slots={slots}
        className="w-full"
        options={{
          pageLength,
          lengthChange: false,
          buttons: ['csv'],
          layout: {
            topStart: 'buttons',
            topEnd: 'search',
            bottomStart: 'info',
            bottomEnd: 'paging',
          },
        }}
      />
    </div>
  )
}

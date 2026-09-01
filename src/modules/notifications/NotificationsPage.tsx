import { Bell } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/Table'
import { LABEL_BY_MODULE } from '../../lib/moods'
import { formatDateTime } from '../../lib/format'
import type { NotificationPrefType, NotificationSettings, Reminder, ReminderChannel, ReminderStatus } from '../../lib/types'
import { useNotifications } from './useNotifications'

const CARD_TITLE = 'mb-1 text-lg font-semibold text-gray-800 dark:text-white/90'
const CARD_SUB = 'block text-gray-500 text-theme-sm dark:text-gray-400'
const HEADER_CELL = 'py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400'
const BODY_CELL = 'py-3 text-gray-500 text-theme-sm dark:text-gray-400'
const LABEL_INPUT = 'form-input rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-slate-900 outline-hidden dark:border-white/10 dark:bg-black/20 dark:text-slate-200'

type Channel = 'Push' | 'Bell' | 'Digest'

/**
 * Every catalogue A/B row (tasks/s30-catalogue.md), in the catalogue's own
 * order. C1-C6 are deliberately absent — they need a budgets model (S34) or
 * S32's balances, neither of which exists, and a toggle for a feature that
 * isn't built is worse than no toggle.
 */
const CATALOGUE: {
  type: NotificationPrefType
  label: string
  description: string
  channel: Channel
  defaultEnabled: boolean
}[] = [
  { type: 'A1', label: 'Dog item due', description: 'A vaccine or medicine due within 24h, or overdue.', channel: 'Push', defaultEnabled: true },
  { type: 'A2', label: 'Car service due', description: 'A service within 1000 km of due, or already overdue.', channel: 'Push', defaultEnabled: true },
  { type: 'A3', label: 'Missed med dose', description: "A dose slot today passed with nothing logged.", channel: 'Push', defaultEnabled: true },
  { type: 'B1', label: 'Recurring bill due', description: '5 days before a bill is due.', channel: 'Push', defaultEnabled: true },
  { type: 'B2', label: 'Recurring bill overdue', description: 'The day after a bill was due, once.', channel: 'Push', defaultEnabled: true },
  { type: 'B3', label: 'Credit card payment due', description: '5 days before a card payment is due.', channel: 'Push', defaultEnabled: true },
  { type: 'B4', label: 'Card statement issued', description: 'On the day your statement is issued.', channel: 'Bell', defaultEnabled: true },
  { type: 'B5', label: 'Instalment payment due', description: '5 days before an instalment payment is due.', channel: 'Push', defaultEnabled: true },
  { type: 'B6', label: 'Instalment plan paid off', description: 'When every payment on a plan is paid.', channel: 'Bell', defaultEnabled: true },
  { type: 'B7', label: 'New SMS awaiting review', description: 'One grouped message at your digest hour.', channel: 'Digest', defaultEnabled: true },
  { type: 'B8', label: 'SMS could not be parsed', description: 'One grouped message at your digest hour. Off by default.', channel: 'Digest', defaultEnabled: false },
  { type: 'B9', label: 'Salary landed', description: 'The moment your salary text arrives.', channel: 'Push', defaultEnabled: true },
]

const CHANNEL_BADGE_COLOR: Record<Channel, 'primary' | 'light' | 'warning'> = {
  Push: 'primary',
  Bell: 'light',
  Digest: 'warning',
}

const STATUS_BADGE_COLOR: Record<ReminderStatus, 'light' | 'success' | 'warning'> = {
  scheduled: 'light',
  sent: 'success',
  snoozed: 'warning',
  cancelled: 'light',
  done: 'success',
}

function channelLabel(channels: ReminderChannel[]): string {
  if (channels.includes('push')) return 'Push'
  if (channels.length === 0) return 'Bell'
  return channels.map((c) => c[0].toUpperCase() + c.slice(1)).join(', ')
}

/** 0 → "12:00 AM", 20 → "8:00 PM". */
function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${twelve}:00 ${period}`
}

function QuietHoursCard({
  settings,
  updateSettings,
}: {
  settings: NotificationSettings | null
  updateSettings: (patch: Partial<Omit<NotificationSettings, 'user_id' | 'created_at'>>) => void
}) {
  const quietStart = settings?.quiet_hours_start.slice(0, 5) ?? '00:00'
  const quietEnd = settings?.quiet_hours_end.slice(0, 5) ?? '08:00'
  const digestHour = settings?.digest_hour ?? 20

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quiet hours &amp; digest</h2>
        <p className="text-xs text-slate-500 dark:text-white/50">
          Push is held during quiet hours and delivered as soon as they end — nothing is dropped. Bank
          texts are bundled into one message at the digest hour below, instead of one push per text.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-micro uppercase text-slate-500 dark:text-white/50">Quiet hours start</span>
          <input
            type="time"
            value={quietStart}
            onChange={(e) => updateSettings({ quiet_hours_start: e.target.value })}
            className={LABEL_INPUT}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-micro uppercase text-slate-500 dark:text-white/50">Quiet hours end</span>
          <input
            type="time"
            value={quietEnd}
            onChange={(e) => updateSettings({ quiet_hours_end: e.target.value })}
            className={LABEL_INPUT}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-micro uppercase text-slate-500 dark:text-white/50">Digest hour</span>
          <select
            value={digestHour}
            onChange={(e) => updateSettings({ digest_hour: Number(e.target.value) })}
            className={LABEL_INPUT}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  )
}

function NotificationTypesCard({
  prefsByType,
  setPrefEnabled,
}: {
  prefsByType: Map<NotificationPrefType, boolean>
  setPrefEnabled: (type: NotificationPrefType, enabled: boolean) => void
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Notification types</h2>
        <p className="text-xs text-slate-500 dark:text-white/50">
          Independently on or off. Off means the reminder is never generated — not even a silent entry
          in your history below.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
        {CATALOGUE.map((row) => {
          const enabled = prefsByType.get(row.type) ?? row.defaultEnabled
          return (
            <div key={row.type} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-white/90">{row.label}</p>
                  <Badge color={CHANNEL_BADGE_COLOR[row.channel]} size="sm">
                    {row.channel}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/50">{row.description}</p>
              </div>
              <label className="flex shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setPrefEnabled(row.type, e.target.checked)}
                  aria-label={`${row.label} notifications`}
                  className="h-4 w-4 rounded border-black/10 dark:border-white/10"
                />
              </label>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function HistoryCard({ history }: { history: Reminder[] }) {
  return (
    <Card>
      <div className="mb-5">
        <h3 className={CARD_TITLE}>History</h3>
        <span className={CARD_SUB}>
          Every reminder generated for you, newest first — including ones that never pushed.
        </span>
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing yet"
          description="Reminders generated for you — bills due, missed doses, bank texts waiting — will show up here as they fire."
        />
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className={HEADER_CELL}>
                  Type
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  Notification
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  When
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  Channel
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className={BODY_CELL}>{LABEL_BY_MODULE[r.source_module]}</TableCell>
                  <TableCell className="py-3">
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{r.title}</p>
                    {r.body && <span className="block text-gray-500 text-theme-xs dark:text-gray-400">{r.body}</span>}
                  </TableCell>
                  <TableCell className={BODY_CELL}>{formatDateTime(r.fire_at)}</TableCell>
                  <TableCell className={BODY_CELL}>{channelLabel(r.channels)}</TableCell>
                  <TableCell className={BODY_CELL}>
                    <Badge color={STATUS_BADGE_COLOR[r.status]} size="sm">
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

export function NotificationsPage() {
  const { loading, available, history, prefsByType, settings, setPrefEnabled, updateSettings } = useNotifications()

  if (loading) return <PageSkeleton />

  if (!available) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="NOTIFICATIONS" title="Notifications" />
        <Card>
          <h3 className={CARD_TITLE}>Not set up yet</h3>
          <span className={CARD_SUB}>The notifications migrations have not been applied to this project.</span>
          <p className="mt-4 rounded-lg bg-gray-50 p-3 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
            supabase/migrations/20260831180000_notification_prefs.sql
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="NOTIFICATIONS" title="Notifications" />
      <QuietHoursCard settings={settings} updateSettings={updateSettings} />
      <NotificationTypesCard prefsByType={prefsByType} setPrefEnabled={setPrefEnabled} />
      <HistoryCard history={history} />
    </div>
  )
}

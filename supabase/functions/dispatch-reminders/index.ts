import { createClient } from 'npm:@supabase/supabase-js@2'
import { notify, type ReminderChannel } from '../_shared/notify.ts'

const MODULE_PATHS: Record<string, string> = {
  dog: '/dog',
  car: '/car',
  meds: '/meds',
  expense: '/expenses',
  bill: '/bills',
  inbox: '/inbox',
  // No dedicated page yet for either — S32c is unbuilt. InstallmentCards
  // already renders on /analytics, so that beats a dead '/'.
  card: '/analytics',
  installment: '/analytics',
}

/** "HH:MM" wall-clock time in `tz` at `at`, using the same ICU-backed
 *  technique as cairoOffsetMinutes in sms-ingest/parsers/shared.ts. */
function localTimeHHMM(tz: string, at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    at,
  )
}

/** `start`/`end` are Postgres `time` strings ("HH:MM:SS"). Handles a window
 *  that wraps midnight, though the signed-off default (00:00-08:00) does not. */
function isWithinQuietHours(nowHHMM: string, start: string, end: string): boolean {
  const s = start.slice(0, 5)
  const e = end.slice(0, 5)
  if (s === e) return false
  return s < e ? nowHHMM >= s && nowHHMM < e : nowHHMM >= s || nowHHMM < e
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('status', 'scheduled')
    .lte('fire_at', new Date().toISOString())
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // reminders.user_id and profiles.id both reference auth.users independently —
  // there's no direct FK between the two tables for PostgREST to embed, so
  // fetch profiles separately and join in code.
  const userIds = [...new Set((reminders ?? []).map((r) => r.user_id))]
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, telegram_chat_id, push_subscription, timezone').in('id', userIds)
    : { data: [] }
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  // notification_settings is created by 20260831180000_notification_prefs.sql.
  // If that migration has not reached this environment yet, PostgREST returns
  // PGRST205/42P01 — fall back to the catalogue's signed-off defaults rather
  // than failing the whole dispatch run.
  const settingsByUser = new Map<string, { quiet_hours_start: string; quiet_hours_end: string }>()
  if (userIds.length) {
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('user_id, quiet_hours_start, quiet_hours_end')
      .in('user_id', userIds)
    if (!settingsError) {
      for (const s of settings ?? []) settingsByUser.set(s.user_id, s)
    }
  }

  const results = []
  for (const reminder of reminders ?? []) {
    const { data: userRes } = await supabase.auth.admin.getUserById(reminder.user_id)
    const email = userRes?.user?.email ?? null
    const profile = profileById.get(reminder.user_id)
    const timezone = profile?.timezone ?? 'Africa/Cairo'
    const quiet = settingsByUser.get(reminder.user_id) ?? { quiet_hours_start: '00:00', quiet_hours_end: '08:00' }
    const inQuietHours = isWithinQuietHours(localTimeHHMM(timezone, new Date()), quiet.quiet_hours_start, quiet.quiet_hours_end)

    const channelResults = await Promise.all(
      (reminder.channels as ReminderChannel[]).map((channel) => {
        // Push interrupts; quiet hours hold it, they never drop it. Leaving
        // the reminder at status 'scheduled' below means the next run (every
        // minute) retries once the window ends.
        if (channel === 'push' && inQuietHours) {
          return Promise.resolve({ channel, sent: false, reason: 'Held: quiet hours' })
        }
        return notify(channel, {
          title: reminder.title,
          body: reminder.body,
          image_url: reminder.image_url,
          url: MODULE_PATHS[reminder.source_module] ?? '/',
          chat_id: profile?.telegram_chat_id ?? null,
          // deno-lint-ignore no-explicit-any
          push_subscription: (profile?.push_subscription as any) ?? null,
          email,
        }).then((result) => ({ channel, ...result }))
      }),
    )

    // Only mark delivered when something actually went out. Previously this
    // ran unconditionally, so a reminder whose every channel failed (or was
    // held for quiet hours) was recorded as sent and never retried.
    if (channelResults.some((r) => r.sent)) {
      await supabase
        .from('reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reminder.id)
    }

    results.push({ id: reminder.id, title: reminder.title, channelResults })
  }

  return new Response(JSON.stringify({ dispatched: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

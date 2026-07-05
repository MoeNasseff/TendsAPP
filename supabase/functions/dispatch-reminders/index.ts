import { createClient } from 'npm:@supabase/supabase-js@2'
import { notify, type ReminderChannel } from '../_shared/notify.ts'

const MODULE_PATHS: Record<string, string> = {
  dog: '/dog',
  car: '/car',
  meds: '/meds',
  expense: '/expenses',
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
    ? await supabase.from('profiles').select('id, telegram_chat_id, push_subscription').in('id', userIds)
    : { data: [] }
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  const results = []
  for (const reminder of reminders ?? []) {
    const { data: userRes } = await supabase.auth.admin.getUserById(reminder.user_id)
    const email = userRes?.user?.email ?? null
    const profile = profileById.get(reminder.user_id)

    const channelResults = await Promise.all(
      (reminder.channels as ReminderChannel[]).map((channel) =>
        notify(channel, {
          title: reminder.title,
          body: reminder.body,
          image_url: reminder.image_url,
          url: MODULE_PATHS[reminder.source_module] ?? '/',
          chat_id: profile?.telegram_chat_id ?? null,
          // deno-lint-ignore no-explicit-any
          push_subscription: (profile?.push_subscription as any) ?? null,
          email,
        }).then((result) => ({ channel, ...result })),
      ),
    )

    await supabase
      .from('reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', reminder.id)

    results.push({ id: reminder.id, title: reminder.title, channelResults })
  }

  return new Response(JSON.stringify({ dispatched: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

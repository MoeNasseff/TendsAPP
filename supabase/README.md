# Reminders / notifications backend

How the notify layer, Edge Functions, and `pg_cron` schedules fit together.

## Architecture

```
dog_items / car_services / meds   ──generate_reminders()──▶  reminders (status='scheduled')
                                        (pg_cron, */15min)              │
                                                                         │ dispatch-reminders
                                                                         │ (pg_cron, every min)
                                                                         ▼
                                                     notify(channel, payload) — telegram / push / email / whatsapp(stub)
                                                                         │
                                                                         ▼
                                                          reminders.status = 'sent'
```

- **`generate_reminders()`** — a Postgres function (see `migrations/20260705000001_reminders_generation_and_cron.sql`) that derives `reminders` rows from the source tables: dog vaccines/meds due within 24h, car services within 1000km (or overdue), and missed med doses (a scheduled `times_of_day` slot today with no matching `med_logs.taken=true`). Guarded against duplicate inserts per source item per day. Runs every 15 minutes via `pg_cron`.
- **`dispatch-reminders`** (Edge Function) — runs every minute via `pg_cron` + `pg_net`, fetches `reminders` where `status='scheduled' and fire_at <= now()`, fans out to each row's `channels[]` via `notify()`, marks `status='sent', sent_at=now()`.
- **`telegram-webhook`** (Edge Function) — receives Telegram bot updates. On `/start <userId>`, links that Telegram chat to `profiles.telegram_chat_id` so future reminders reach that chat.
- **On-site popups** — the client (`useDueReminders` hook) polls + subscribes to `reminders` where `status in ('scheduled','sent','snoozed')` and `fire_at <= now()`, and shows them as in-app toasts with Done / Snooze 10m / Snooze 1h, regardless of whether external dispatch happened — "sent" only means an external channel was *attempted*, not that the user has acknowledged it.

## Environment / secrets

Client-side (`.env`, safe to expose):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TELEGRAM_BOT_USERNAME=      # public bot username, used for the "Connect Telegram" deep link
```

Server-side only — set via `supabase secrets set KEY=value`, **never** as `VITE_`-prefixed client vars:
```
TELEGRAM_BOT_TOKEN=              # from @BotFather
TELEGRAM_WEBHOOK_SECRET=         # random string; verified via the x-telegram-bot-api-secret-token header
CRON_SECRET=                     # random string; verified via dispatch-reminders' Authorization header
VAPID_PUBLIC_KEY=                # `npx web-push generate-vapid-keys`
VAPID_PRIVATE_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
WHATSAPP_ENABLED=false           # flip to true once Meta Cloud API creds below are set
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
```

## One-time setup

1. **Deploy the functions:**
   ```
   supabase functions deploy dispatch-reminders --no-verify-jwt
   supabase functions deploy telegram-webhook --no-verify-jwt
   ```
   `--no-verify-jwt` is required because both are invoked without a Supabase user JWT (by `pg_cron`/`pg_net` and by Telegram, respectively). Each implements its own auth instead: `dispatch-reminders` checks `Authorization: Bearer $CRON_SECRET`; `telegram-webhook` checks the `x-telegram-bot-api-secret-token` header.

2. **Set secrets** (see above), **then create the vault secret the cron job reads at runtime** (its value must never be a literal in a committed migration — `pg_cron` jobs are plain SQL text, so the `dispatch-reminders` cron job reads `CRON_SECRET` from Supabase Vault instead of embedding it):
   ```sql
   select vault.create_secret('<same value as the CRON_SECRET Edge Function secret>', 'cron_secret');
   ```
   Then push migrations (`supabase db push`) — the migration enables `pg_cron`/`pg_net` and schedules both jobs. If you rotate `CRON_SECRET`, update both the Edge Function secret (`supabase secrets set CRON_SECRET=...`) and the vault secret (`select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<new value>')`).

3. **Register the Telegram webhook** (once, after deploying):
   ```
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://<project-ref>.supabase.co/functions/v1/telegram-webhook","secret_token":"'"$TELEGRAM_WEBHOOK_SECRET"'"}'
   ```

4. **Users link Telegram** by tapping "Connect" in the app's Notifications panel — this opens `https://t.me/<bot_username>?start=<their-user-id>`; the webhook reads that payload and sets `profiles.telegram_chat_id`.

## Known limitations (MVP scope)

- `generate_reminders()` treats all `times_of_day` as UTC — no per-profile timezone conversion yet, despite `profiles.timezone` existing in the schema. Fine for a single-timezone household; worth revisiting if usage spans timezones.
- WhatsApp is fully stubbed (`notify()` logs and returns `sent:false` without calling Meta's API) — flip `WHATSAPP_ENABLED=true` and fill in the Meta Cloud API credentials once ready, then implement the actual `fetch()` call in `_shared/notify.ts` (mirror the request shape in `config/n8n/whatsapp-meeting-bot.json` from the legacy app).

## Alternative: n8n (documented, not built)

The legacy repo's `config/n8n/` workflows (`reminder-cron.json`, `telegram-meeting-bot.json`, `whatsapp-meeting-bot.json`) implement the same "fetch due → fan out per channel → mark sent" shape against a `meetings` table. To repoint that pipeline at this app instead:

- Swap every `meetings` reference for `reminders` (same due-fetch pattern: `status=eq.scheduled&fire_at=lte.<now>`).
- Reuse the Telegram/email message templates as-is (they're plain string/HTML templates, not `meetings`-specific).
- Point "Insert to Supabase" nodes at this project's REST URL + anon/service key instead of the AGS project.
- The WhatsApp webhook-verify handshake (`hub.verify_token`/`hub.challenge`) and command-parsing pattern also transfer directly if WhatsApp is enabled via n8n instead of the Edge Function stub.

n8n is a valid alternative to `pg_cron` + Edge Functions if you'd rather manage the scheduling/dispatch visually — see the legacy `docs/setup-guide.md` for the Railway deployment steps (Telegram bot creation, Meta Cloud API app creation, SMTP credential wiring). Not built here since `pg_cron`/Edge Functions keep everything inside Supabase with no extra hosting.

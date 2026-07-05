# Reuse Inventory — legacy AGS apps → LifeStack modules

Source files read: `assets/js/noteApp.js`, `noteApp.html`, `assets/js/reminderApp.js`, `reminderApp.html`,
`config/n8n/{reminder-cron,telegram-meeting-bot,whatsapp-meeting-bot}.json`, `docs/setup-guide.md`,
`regain.md`, `tailwind.config.js`, `src/css/input.css`.

> Legacy root files are **not modified**. This is a read-only inventory to decide what logic gets ported.

## 1. `noteApp.js` → Expenses module

| Legacy pattern | File:line-ish | Port as |
|---|---|---|
| `supabase.createClient(url, anonKey)` client bootstrap | top of file | `src/lib/supabase.ts`, but URL/key from `import.meta.env.VITE_SUPABASE_URL/ANON_KEY` — never hardcoded like the legacy file does |
| Load → render → insert → delete CRUD cycle (`loadNotes`, form submit handler, `deleteNote` + confirm modal) | `loadNotes()`, `setupForm()`, `deleteNote()/closeDeleteModal()` | `modules/expenses/*` hooks: `useExpenses()` (load), `addExpense()` (insert), `deleteExpense()` behind `<ConfirmDialog/>` — same load→render→insert→delete shape, Supabase JS v2 API unchanged |
| Expenditure/amount field & currency formatting (`parseFloat(...).toLocaleString()`, `EGP` prefix) | `loadNotes()` stat calc, DataTable row template | `expenses.amount numeric` + `currency default 'EGP'`; reuse the `toLocaleString` display pattern in `<StatCard/>` and list rows |
| Department/employee dropdown population + auto-sync (`loadDropdowns`, `setupEmployeeDeptSync`) | `loadDropdowns()` | **Swap framing**: dropdowns become `expense_categories` (user-owned, with color/icon) instead of AGS departments/employees — same "load once, populate `<select>`" shape, now via a `useCategories()` hook feeding a React `<select>`/`<Combobox>` |
| DataTables column/render config (jQuery DataTable with custom cell HTML, `columnDefs`, responsive) | `loadNotes()` bottom half | Not porting jQuery DataTables itself (React app) — but keep the *column intent*: avatar/name cell, title, category badge, truncated note, amount badge, date, actions. Rebuild as a React table/list component with the same columns and the same "hide description on mobile, actions column non-orderable" responsive behavior via Tailwind `hidden md:table-cell` |
| Toast helper (`showToast(message, type)`, DOM-based, auto-dismiss 3s, slide-in `.toast.show`) | bottom of file | `useToast()` hook + `<ToastHost/>` — same 3 variants (success/error/info), same icon-per-type, same auto-dismiss timing (3000ms) and slide transition, reused **app-wide** (not just Expenses) |
| Inline "view/edit" modal with per-field `contenteditable`, dirty-check before showing a Save bar (`viewNote()`) | `viewNote()` | Good pattern to reuse for the Expenses "edit" modal: editable fields diffed against original values, Save bar only appears when `hasChanges()` — port as controlled React inputs + a `isDirty` memo instead of `contenteditable` DOM diffing |
| `escapeHtml`, `formatDate` helpers | bottom of file | Not needed as-is (React escapes by default); `formatDate` logic (`en-GB` day/month/year + time) ports directly into a small `formatDate()` util |

## 2. `reminderApp.js` → shared Reminder backbone (used by Dog/Car/Meds/Expenses reminders)

| Legacy pattern | File:line-ish | Port as |
|---|---|---|
| Real-time `postgres_changes` INSERT subscription (`sb.channel('meetings-realtime').on('postgres_changes', {event:'INSERT', schema:'public', table:'meetings'}, ...).subscribe()`) | `DOMContentLoaded` handler | `useRealtime(table, onInsert)` hook — same channel/subscribe shape, generalized to any table (`reminders`, `dog_items`, `med_logs`, ...). This is **the** backbone for "new rows appear live, incl. bot-created" across all 4 modules |
| Tab / filter / stat-card structure (`switchTab`, `filterMeetings`, `updateStats`) | mid-file | `<Tabs/>` + `<StatCard/>` shared components; per-module screens compute their own stat numbers the same way (`.filter(...).length` style aggregates) |
| Status-update flow via a modal listing valid transitions (`openStatusModal`, `updateMeetingStatus`) | `openStatusModal()` | Generalizes to reminder `status` (`scheduled/sent/snoozed/cancelled/done`) and to Dog/Meds "mark done/taken" — same "open modal → pick new status → PATCH → toast → reload" shape |
| Form validation (required-field check before insert, inline error toast) | `setupForm()` | Same required-field-before-insert pattern for all module forms |
| `getTimeLeft(date)` (days/hours/mins countdown, "Overdue" when negative) | bottom of file | Reuse verbatim logic for reminder due-countdowns and Car "km/days remaining" style displays |
| Leaflet + Nominatim map picker (`openMapPicker`, `searchLocation`, `reverseGeocode`, `confirmMapSelection`) | large block | **Not needed** for any of the 4 new modules (no location field in the data model) — skip porting, no equivalent module needs it |
| Toast helper | identical to noteApp.js | Same shared `useToast()`/`<ToastHost/>` as above (the two legacy files literally duplicate this function — good sign it's a natural shared component) |

## 3. `config/n8n/*.json` → `notify()` layer + Edge Function reference

| Legacy pattern | Port as |
|---|---|
| `reminder-cron.json`: schedule trigger (every 15 min) → fetch `status=pending & reminder_sent=false` → filter to "due within 60 min" in a Code node → fan out to Telegram/WhatsApp/Email → PATCH `reminder_sent=true` | This is the exact shape of the new `dispatch-reminders` Edge Function + `pg_cron`: cron finds `reminders where status='scheduled' and fire_at <= now()`, fans out per `channels[]`, sets `status='sent'`. The n8n "filter upcoming ≤1hr" step becomes the generator side (`generate-reminders`) instead, since in the new schema `fire_at` is already the exact fire time, not derived at send-time |
| Telegram message templates (Markdown, emoji-prefixed fields: 📋 title, 📅 date, ⏱️ countdown, 👤 contact, 📍 location, 📝 notes) | Reuse the **template shape** (emoji-prefixed line-per-field, Markdown) for `notify('telegram', payload)`, adapted per source module (vaccine due, oil change due, dose due) |
| HTML email template (inline-styled dark card, `#3ba8bf` accent, table of fields, footer branding line) | Reuse the **layout structure** (centered card, field table, notes section, footer line) for the SMTP email template, restyled with `brand.config.json` colors instead of hardcoded AGS teal |
| WhatsApp Cloud API webhook verify (`hub.verify_token`/`hub.challenge` GET handshake) + text-command parser (`meeting\nTitle: ...\nDate: ...`) + reply templates | Reference only, since WhatsApp ships **disabled by flag** in the new app — document the same webhook-verify + line-based command parsing approach in `supabase/README.md` for when `WHATSAPP_ENABLED=true` |
| Telegram bot command structure (`/meeting`, `/status`, `/help` registered via @BotFather, per `docs/setup-guide.md`) | Reference for the new Telegram bot commands/webhook Edge Function (`telegram-webhook`) — `/start` to link `chat_id` is new (multi-tenant requirement not present in legacy single-tenant bot) |
| `docs/setup-guide.md` (Railway+n8n deploy, BotFather steps, Meta Cloud API steps, SMTP env vars) + `regain.md` (n8n credential wiring) | Becomes the **documented alternative pipeline** in `supabase/README.md` §"n8n alternative", pointing at the same `reminders` table instead of `meetings` |

## 4. `tailwind.config.js` / `src/css/input.css` → design tokens

| Legacy pattern | Port as |
|---|---|
| `ags.teal/navy/gold/surface/border` custom color palette + `fontFamily.inter` | Not reusing the AGS palette itself (this is personal/multi-tenant, not AGS-branded) — but reuse the **mechanism**: a small semantic color palette extended in Tailwind config, swapped for `brand.config.json`-driven CSS variables (`--brand-primary` etc.) per §0.6 |
| Local self-hosted Inter `@font-face` (woff2, weights 300–800) | Reuse the **local font-hosting approach** conceptually, but the new app uses `@fontsource/inter` per package (per Master Prompt §0), so no manual `@font-face` blocks needed |
| `.glass` card style (`rgba` bg + `backdrop-filter: blur(16px)` + subtle border) | Direct port into the shared `<GlassCard/>` component's base styles |
| Toast slide-in (`transform: translateX(120%)` → `.show { translateX(0) }`, 0.3s ease) | Direct port into `<ToastHost/>` animation |
| Form input focus ring + `:required:invalid` wiggle animation | Direct port into shared form input styles |
| Mobile breakpoint overrides (`@media max-width:640px` collapsing stat grids to 2 cols, hiding tab icons, stacking form grids to 1 col) | Direct port as the mobile-first base behavior (this app is mobile-first from the start rather than a retrofit, but the same breakpoint values/collapse targets apply) |
| Status/source badge colors (`.status-pending/completed/cancelled`, `.source-web/telegram/whatsapp`) | Same "colored pill, 15% bg / full border-alpha 30%" badge recipe reused for `reminders.status` and `channels` badges |

## 5. Explicitly NOT ported

- AGS branding, hardcoded Supabase URL/anon key (both legacy files hardcode the same project — **must not** carry into `.env`/source; new project gets its own Supabase project + keys, requested from user before Step 2).
- `departments`/`employees` domain tables — replaced by personal, per-user `expense_categories`.
- DataTables (jQuery) and Leaflet/Nominatim map picker — no equivalent need in the 4 new modules.
- `functions/noteApp.js` / `functions/reminderApp.js` (Cloudflare Pages Functions proxying the legacy HTML from GitHub) — this is legacy-app deployment plumbing, unrelated to the new `app/` build.

## Net takeaway

The Expenses module ports `noteApp.js`'s CRUD+toast+dropdown shape almost line-for-line (recategorized). Every module's reminder/mark-done/live-update behavior ports `reminderApp.js`'s real-time subscription + tab/filter/status-modal shape. The `notify()`/Edge Function layer mirrors the n8n cron's "fetch due → fan out per channel → mark sent" shape and reuses its Telegram/email message templates almost verbatim (re-themed). The Leaflet map picker and jQuery DataTables are the only substantial legacy pieces with no home in the new spec.

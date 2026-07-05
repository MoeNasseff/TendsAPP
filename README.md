# Tend

A mobile-first personal life-ops dashboard with four modules: **Expenses**, **Dog Health**, **Car Maintenance**, and **My Meds**. Built on Vite + React + TypeScript + Tailwind CSS + Supabase.

The app is fully re-brandable — see [Branding](#branding) below.

## Stack

- Vite + React 19 + TypeScript + Tailwind CSS v3
- Supabase (Postgres + Auth + Storage + Edge Functions + `pg_cron`)
- React Router v7
- `recharts` (Expenses charts), `three` / `@react-three/fiber` (Dog module hero animation)
- `vite-plugin-pwa` (installable, offline shell, web push)

## Getting started

```
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at minimum
npm run dev
```

Opens at `http://localhost:5173` (or the next free port). Sign up with any email/password or a magic link — your account is auto-seeded once with a sample dog, car, and meds (see `src/lib/seed.ts`).

## Project structure

```
src/
  main.tsx, App.tsx, router.tsx     # app entry, routing (lazy-loaded per module)
  sw.ts                             # custom service worker (push, notificationclick, precaching)
  lib/                              # supabase client, brand config, formatting, seed, notify, pwa helpers
  hooks/                            # useAuth, useToast, useRealtime, useDueReminders, useBrand
  components/                       # shared UI: AppShell, Header, StatCard, GlassCard, modals, etc.
  modules/
    expenses/  dog/  car/  meds/    # one folder per module: a data hook + form(s) + page
  styles/moods.css                  # per-module accent theming (data-mood="...")
supabase/
  migrations/*.sql                  # schema, RLS, pg_cron, realtime publication
  functions/                        # dispatch-reminders, telegram-webhook, _shared/notify.ts
  README.md                         # reminders/notify architecture, secrets, setup steps
scripts/
  gen-brand.ts                      # brand.config.json -> manifest.webmanifest + index.html (predev/prebuild)
  gen-icons.ts                      # one-off: rasterizes the logo into PWA icon PNGs
```

## Branding

Everything brand-related is driven by a single file, `brand.config.json`:

```json
{
  "appName": "Tend",
  "colors": { "brandPrimary": "#278276", ... },
  "logo": { "src": "/brand/logo.svg" },
  ...
}
```

Editing `appName`, `colors`, or the logo/icon paths and running `npm run dev` (or `npm run build`) regenerates `manifest.webmanifest` and patches `index.html`'s `<title>`/favicon/theme-color automatically — no other code changes needed. To swap the actual logo/icon artwork, replace the files under `public/brand/` and re-run `npm run gen-icons` if you changed `public/brand/favicon.svg`.

Each of the four modules layers its own accent "mood" on top of the brand base (see `src/styles/moods.css`), applied via a `data-mood="expenses|dog|car|meds"` attribute on each module's route wrapper.

## Reminders / notifications

See [`supabase/README.md`](./supabase/README.md) for the full architecture: `pg_cron`-driven reminder generation and dispatch, the `notify()` channel abstraction (Telegram, Web Push, Email, WhatsApp-stubbed), and the on-site popover.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (runs `gen-brand.ts` first) |
| `npm run build` | Type-check + production build (runs `gen-brand.ts` first) |
| `npm run gen-icons` | Regenerate PWA icon PNGs from `public/brand/favicon.svg` |
| `npm run lint` | oxlint |

## Environment variables

See `.env.example` for the full list. Client-side (`VITE_`-prefixed) values go in `.env`; everything else (bot tokens, SMTP, VAPID private key) is a Supabase Edge Function secret — never a client env var.

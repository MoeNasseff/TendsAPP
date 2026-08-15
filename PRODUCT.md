# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Today: the owner and their household — one person tracking their own dog,
car, meds, expenses (EGP), and body measurements day to day, with the
possibility of a spouse/family member logging items for shared pets or
vehicles. Roadmap: public release to unrelated users, so the auth and data
model should not be designed as if single-tenant is permanent even though the
near-term audience is personal.

## Product Purpose

A personal life-management PWA that unifies five otherwise-unrelated tracking
domains — Expenses, Dog care, Car maintenance, Meds, Body measurements — into
one app with a shared design language, shared privacy model, and shared
reminder infrastructure. Success is replacing scattered spreadsheets/notes
apps/single-purpose trackers with one coherent tool the owner actually keeps
using.

## Positioning

Premium editorial design applied to mundane tracking. The domains themselves
(oil changes, vet vaccines, medication adherence, grocery-money expenses) are
unglamorous and most competing trackers in this space read as generic
dashboards. Tend's differentiator is that it doesn't look like one — serif
display typography, a real elevation/surface ramp, per-module accent colors,
no icon-in-tinted-square or other "AI-generated dashboard" tells. A
competing app could copy the feature list; it could not truthfully copy the
craft bar without doing the same design work.

## Operating Context

- Egyptian currency (EGP) for all expense tracking.
- Metric/imperial unit toggle for body measurements (height/weight), stored
  canonically in metric.
- Installable PWA, used mobile-first, offline-capable via a service worker.
- Multi-channel reminders: push (VAPID), Telegram bot, email (requires the
  app owner to configure SMTP — not available by default), WhatsApp.
- Supabase is the sole backend: Postgres, Auth (email/password + magic
  link), Storage (item photos), Realtime.

## Capabilities and Constraints

- Five modules, each with CRUD for its domain's items: Expenses (categorized
  transactions + CSV/table export), Dog (vaccines/medicines/schedule, with
  reminders and a mark-done flow), Car (service log, odometer tracking,
  interval-based due dates), Meds (daily schedule, adherence tracking), Body
  (measurement history, BMI, unit-aware figure diagram).
- Add/edit flows are modal-based; the four list-style modules' history/detail
  tables use DataTables.js (sort, paginate, CSV/export) — the project's first
  jQuery dependency, added deliberately for this. Body's measurement history
  stays chart-based, not tabular.
- Privacy: sensitive values (money amounts, body measurements) are blurred
  behind a single global tap-to-reveal toggle. **Not** biometric today —
  WebAuthn/biometric unlock is an explicit future want, not yet built; do not
  assume it exists when working on the privacy layer.
- Accessibility is a deliberate, confirmed product standard, not incidental:
  WCAG AA text contrast and 44px minimum touch targets are enforced as of
  this session's audit, along with `prefers-reduced-motion` support
  throughout the motion system.
- A sprite animation runtime exists (`src/components/sprite/`,
  `useSpriteAnimation`, generated webp assets) but is currently unmounted
  from every page — deliberately deferred to a later task, not deleted.
- Local dev quirk: `~/.npmrc` sets `ignore-scripts=true`, so `prebuild`
  (which regenerates the PWA manifest from `brand.config.json`) does not run
  automatically; `scripts/gen-brand.ts` must be run by hand after brand
  changes.
- Terminology: a module's accent color scheme is called its "mood" (the
  `data-mood` attribute); this is internal/code terminology, not
  user-facing copy.

## Brand Commitments

- Name: **Tend**. Tagline: "Everything you look after, in one place."
- Typography: Libre Caslon Text (serif, display) + Inter (sans, body/data).
- Palette: OLED-dark base (`#111415`), brand primary teal `#278276`, brand
  accent gold `#e0a83a`; five per-module accents (Expenses emerald, Dog
  rust/orange, Car red, Meds teal, Body violet).
- Copy register is deliberately plain and factual — luxury/concierge
  language ("Premium Stewardship", "Estate Maintenance", "Concierge",
  "Vault") was considered and explicitly rejected as parody-adjacent for an
  app that tracks a dog, a car, meds, and grocery money. The visual system
  is premium; the copy is not.

## Evidence on Hand

This is a live app with real Supabase-backed personal data, not a marketed
product with a customer base. No testimonials, customer names, pricing, or
usage claims exist and none should be fabricated for any future public-facing
surface (e.g. a marketing/landing page) until the public release actually
has them.

## Product Principles

1. One shared system across five domains, not five bespoke mini-apps —
   privacy, reminders, forms, and tables all work identically regardless of
   which module they're in.
2. Editorial craft is the differentiator, applied deliberately to
   "boring" utility domains rather than reserved for a marketing surface.
3. Household-first today, public-multi-tenant-ready roadmap — don't make
   architecture choices that assume single-owner permanence.
4. Plain, factual copy always, even as the visual system gets more premium.
5. Accessibility (contrast, touch targets, reduced motion) is enforced, not
   aspirational.

## Accessibility & Inclusion

WCAG AA text contrast and 44px minimum touch targets are confirmed
requirements (audited and fixed this session — see `index.css`'s
`.tap-target`/focus-visible rules and `moods.css`'s `--mood-accent-text`).
`prefers-reduced-motion` is respected throughout `lib/motion.ts` and every
Motion call site. Biometric auth is a stated future want for the privacy
layer, not yet implemented.

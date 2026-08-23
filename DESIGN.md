---
name: Tend
description: Everything you look after, in one place.
colors:
  brand-25: "#f2f7ff"
  brand-50: "#ecf3ff"
  brand-100: "#dde9ff"
  brand-200: "#c2d6ff"
  brand-300: "#9cb9ff"
  brand-400: "#7592ff"
  brand-500: "#465fff"
  brand-600: "#3641f5"
  brand-700: "#2a31d8"
  brand-800: "#252dae"
  brand-900: "#262e89"
  brand-950: "#161950"
  gray-25: "#fcfcfd"
  gray-50: "#f9fafb"
  gray-100: "#f2f4f7"
  gray-200: "#e4e7ec"
  gray-300: "#d0d5dd"
  gray-400: "#98a2b3"
  gray-500: "#667085"
  gray-600: "#475467"
  gray-700: "#344054"
  gray-800: "#1d2939"
  gray-900: "#101828"
  gray-950: "#0c111d"
  white: "#ffffff"
  success-500: "#12b76a"
  error-500: "#f04438"
  warning-500: "#f79009"
typography:
  title-md:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: "44px"
  title-sm:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: "38px"
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  display-sm:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  stat:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  theme-xl:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "30px"
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  theme-sm:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  theme-xs:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
  label:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.1rem
    letterSpacing: "0.06em"
  micro:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1rem
    letterSpacing: "0.1em"
rounded:
  card: "1rem"
  control: "0.5rem"
  pill: "999px"
spacing:
  section-gap: "2.5rem"
  card-padding: "1.25rem"
  control-padding-x: "0.75rem"
  control-padding-y: "0.5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-500}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.gray-700}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.gray-700}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.gray-800}"
    rounded: "{rounded.control}"
    padding: "{spacing.control-padding-y} {spacing.control-padding-x}"
---

# Design System: Tend

> **Status: mid-migration.** This document describes the system as of the
> TailAdmin redesign (pass 2, branch `tailwind4-redesign`). The token layer in
> `src/index.css` implements it in full. The module pages do **not** yet — many
> still carry dark-only literals (`text-white/50`, `text-slate-400`) and are
> being converted screen by screen. The app also still **defaults to dark**;
> flipping the default to light is the final step. Treat this as the target, and
> read `tasks/current-theme-spec.md` for the system it replaced.

## Overview

Tend is a household record-keeper — grocery money, a dog's vaccine schedule, an
oil change, a medication dose, a body measurement. The visual system is
**TailAdmin**: a clean, light-first admin surface built on an indigo brand ramp
and a neutral gray scale, with soft elevation and a single accent used
consistently across every module.

The system is deliberately conventional. Legibility, familiar affordances and
consistent spacing carry it; personality is not the goal, and no screen should
require the user to learn a bespoke visual language before they can find a
number.

**Key characteristics:**
- One sans face — **Outfit** — across display, data and body copy.
- A single brand accent (`brand-500`) app-wide. No per-module accent colours.
- Light-first, with a full dark counterpart driven by `data-theme` on `<html>`.
- Soft elevation from a documented shadow scale, plus hairline borders.
- Every interactive control clears a 44px touch target and gets a focus ring,
  even where the visible control is smaller.

## Colors

A light neutral ground (`gray-50`) with white content surfaces, and a single
indigo accent. The dark counterpart inverts the ground to `gray-900` while
keeping the same accent.

### Brand
- **`brand-500` (`#465fff`)** — the accent. Primary buttons, active navigation,
  focus rings, chart series, links. In dark mode, accent *text* steps up to
  `brand-400`/`brand-300` for contrast.
- The `brand-25`→`brand-950` ramp exists for tints and washes: `brand-50` backs
  the active sidebar item in light mode, `brand-500/[0.12]` in dark.

### Neutrals
- **`gray-50`** — the page ground in light mode.
- **`white`** — content cards and inputs.
- **`gray-200`** — hairline borders in light mode.
- **`gray-700`** — body text; **`gray-500`** for secondary and label text.
- **`gray-900`** — the page ground in dark mode; `gray-800` for raised surfaces.

### Status
`success-500`, `error-500`, `warning-500` for state — never the brand accent for
a success or an error.

### Named rule
**The One Accent Rule (retained, redefined).** Exactly one accent is live —
`brand-500` — and it is the same on every screen. Status colours are the only
other hues, and only to signal state. Do not introduce a second decorative hue.

## Typography

**One face: Outfit** (with `system-ui, sans-serif` fallback), self-hosted via
`@fontsource`. It is never loaded from a CDN — the app is an installable PWA, so
a third-party font request would break offline use.

### Hierarchy
- **`title-md`/`title-sm`** (36/30px, 600) — marketing and empty-state headlines.
- **`display`** (2rem, 600) — page-level `<h1>` via `PageHeader`.
- **`display-sm`** (1.5rem, 600) — section titles, modal headers.
- **`stat`** (2.25rem, 600) — the primary numeral in a `StatCard`.
- **`theme-xl`** (20px, 500) — prominent inline values.
- **`body`** (0.875rem, 400) — running text, list rows, table cells.
- **`theme-sm`** (14px, 500) — navigation items, buttons.
- **`theme-xs`** (12px, 400) — helper and meta text.
- **`label`** (0.75rem, 500, tracked) — tab labels, short UI text.
- **`micro`** (0.625rem, 500, tracked, uppercase) — field labels, eyebrows.

Weight, size and colour carry hierarchy. There is no second typeface doing that
work, so restraint in weight is what keeps a screen readable.

## Layout

Unchanged from the previous system, which was sound. Single-column content
stacked with `gap-10` (40px) between top-level sections — deliberately larger
than a typical dashboard's `gap-5`, because uniform tight spacing is what makes
a screen read as a data dump. Content sits in a `max-w-5xl` column, `px-4`
mobile / `px-8` at `sm:`, with bottom padding clearing the fixed mobile nav plus
its safe-area inset.

Stat cards use `grid grid-cols-2 sm:grid-cols-4`, the one place a uniform grid
is correct.

Breakpoints are Tailwind's defaults plus TailAdmin's additions: `2xsm` 375px,
`xsm` 425px, `3xl` 2000px.

## Elevation & depth

Elevation comes from the **shadow scale** (`shadow-theme-xs` → `theme-xl`) plus
hairline borders, over white surfaces on a `gray-50` ground.

Content cards take `shadow-theme-xs` and a `gray-200` border. Overlay chrome —
modals, toasts, dropdowns — takes `theme-lg` or `theme-xl`. In dark mode shadows
are suppressed and depth returns to the tonal step plus a `white/6` hairline,
because a shadow over a near-black ground does nothing.

## Shapes

Two radius steps by role: **1rem** for content containers (cards, modal panels)
and **0.5rem** for controls (buttons, inputs, chips, nav items). `rounded-full`
only for genuinely circular things — avatars, status dots. No sharp corners, no
clipped or angled corners.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px), never the card radius.
- **Primary:** `bg-brand-500`, white text, `px-4 py-2`, `font-medium`. Hover
  goes to `brand-600` — a colour step, not an opacity drop.
- **Ghost/secondary:** `border border-gray-300 text-gray-700`, hover
  `bg-gray-50`. Dark: `border-white/10 text-gray-300`, hover `bg-white/5`.
- **Icon-only:** transparent, `text-gray-500`, `p-1.5`–`p-2`, hover
  `bg-gray-100`. Always carries `.tap-target` and the global focus ring.

### Cards
1rem radius, white background, `gray-200` hairline, `shadow-theme-xs`, 1.25rem
padding, via the shared `Card` primitive. Dark: `gray-800`-ish surface, `white/6`
hairline, no shadow.

### Inputs / fields
Styling lives in the `.form-input` class in `src/index.css`, **not** on each
element — white background, `gray-300` border, `gray-800` text, with the dark
counterpart alongside. Focus shifts the border to `brand-500` and adds the
`focus-ring` shadow.

Labels are always a real `<label>` at Micro size tied via `htmlFor`/`id`. Never
placeholder-only labelling.

> Note: `.form-input` is unlayered CSS, so it outranks Tailwind's layered
> utilities. Colour utilities on an input element will not win against it — set
> colour here, not at the call site.

### Modals / dialogs
Rendered through `Portal` into `document.body` — required for correct
`position: fixed` behaviour under any `backdrop-filter` ancestor. Backdrop
`bg-black/60 backdrop-blur-xs`; panel at card radius, `max-w-lg` for forms or
`max-w-sm` for confirmations.

Motion: backdrop fades at `DUR.fast`; panel fades and scales 0.98→1 at
`DUR.base`. Every value comes from `lib/motion.ts` and every call site checks
`useReducedMotion()`.

### Navigation
- **Sidebar (desktop):** active item is a filled tinted pill —
  `bg-brand-50 text-brand-500`, dark `bg-brand-500/[0.12] text-brand-400`.
  Inactive `text-gray-700` with a `gray-100` hover. Collapses to a 16-unit icon
  rail; the pill is what carries the active state at rail width.
- **Bottom nav (mobile):** icon + Micro label stack, active in `brand-500`.
- **Tabs:** Label-size pills; active tab takes a solid raised background.

### Data tables (DataGrid)
The one component built on a library rather than primitives — DataTables.js,
re-themed through its `--dt-*` custom properties rather than fighting its markup
(`.dt-theme` in `index.css`). Paging buttons, search input and CSV button are
forced to a 44px minimum height; DataTables' own sizing does not clear the
touch-target floor.

## Do's and Don'ts

### Do
- **Do** use `brand-500` as the only accent, and status colours only for state.
- **Do** set input colours in `.form-input`, not on the element.
- **Do** give every icon-only button `.tap-target` plus a visible
  `:focus-visible` state.
- **Do** pair every light value with its dark counterpart. A bare `text-white/50`
  is a bug — it is invisible in light mode.
- **Do** keep every animation value sourced from `lib/motion.ts` and guarded by
  `useReducedMotion()`.

### Don't
- **Don't** use a dashed border anywhere — `border-dashed` is banned outright; it
  read as an unfinished/placeholder state everywhere it appeared.
- **Don't** introduce a second decorative accent hue.
- **Don't** use spring/bounce easing, or write a duration/easing value outside
  `lib/motion.ts`.
- **Don't** load fonts from a CDN — self-host through `@fontsource`.
- **Don't** adopt a luxury/concierge copy register ("Stewardship", "Estate",
  "Concierge", "Vault") even though the visual system is clean and corporate —
  copy stays plain and factual. This is a confirmed, deliberate product
  decision, not an oversight, and it survives the redesign unchanged.

## Superseded rules

The previous system ("The Editorial Almanac") was built around a dark ground,
Libre Caslon serif display type, five per-module accents, and zero shadows. It
was replaced deliberately in the TailAdmin redesign. Its rules are recorded here
because the reasoning behind them is still worth knowing — the full
specification, including exact token values, is in
`tasks/current-theme-spec.md`.

- **The Numeral Rule** — *retired.* Any "how much / how many" value rendered in
  the display serif at stat size. There is no serif now; `stat` size and weight
  carry it instead.
- **The Flat-Content Rule** — *retired.* No shadows on anything that scrolls;
  depth from a four-step tonal ramp plus a hairline. That works on a near-black
  ground and stops working on a light one, which is why the shadow scale arrived
  with the light palette. The rule still holds inside dark mode, where shadows
  are suppressed.
- **The One Accent Rule** — *retained but redefined.* Formerly one *module*
  accent per screen via `data-mood`; now one accent app-wide.
- **The No-Chip Rule** — *retired.* Icons were never allowed inside a tinted
  rounded-square background, identified as the clearest "AI-generated dashboard"
  tell. TailAdmin uses that pattern (tinted icon containers in metric cards,
  tinted pills in navigation), and adopting its component language means
  adopting it. Worth re-reading the original reasoning before adding more of
  them than the template itself calls for.

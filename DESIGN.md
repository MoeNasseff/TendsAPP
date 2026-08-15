---
name: Tend
description: Everything you look after, in one place.
colors:
  deep-verdigris: "#278276"
  emerald: "#10b981"
  burnt-terracotta: "#a8471f"
  signal-red: "#ee1c25"
  apothecary-teal: "#14b8a6"
  dusty-violet: "#a78bfa"
  void: "#0c0f10"
  ink: "#111415"
  slate: "#191c1d"
  graphite: "#373a3b"
typography:
  display:
    fontFamily: "'Libre Caslon Text', Georgia, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  display-lg:
    fontFamily: "'Libre Caslon Text', Georgia, serif"
    fontSize: "clamp(2.5rem, 6vw, 3.5rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  display-sm:
    fontFamily: "'Libre Caslon Text', Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  stat:
    fontFamily: "'Libre Caslon Text', Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.1rem
    letterSpacing: "0.06em"
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
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
    backgroundColor: "{colors.deep-verdigris}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.5)"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.slate}"
    textColor: "rgba(255,255,255,0.75)"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "rgba(0,0,0,0.2)"
    textColor: "rgba(226,232,240,1)"
    rounded: "{rounded.control}"
    padding: "{spacing.control-padding-y} {spacing.control-padding-x}"
---

# Design System: Tend

## Overview

**Creative North Star: "The Editorial Almanac"**

Tend is a beautifully typeset reference book for the unglamorous parts of
keeping a household running — grocery money, a dog's vaccine schedule, an
oil change, a medication dose, a body measurement. It reads as a
publication, not a dashboard: serif display numerals and headings sit over
a calm, dark, tonally-layered ground, with exactly one accent color active
per module at a time. The "premium" feeling comes from being warm and
personal rather than cold and minimal — this is a household's own record,
dressed up, not a sterile enterprise tool. Interaction is tactile and
confident: real touch targets, decisive color on the one primary action per
screen, visible feedback on hover and focus.

The system was deliberately built against a specific failure mode — the
generic "AI-generated dashboard" look (icon-in-a-tinted-rounded-square,
gradient-hero cards, emoji used as icons, uniform-weight card grids where
nothing reads as more important than anything else). Every primitive in
this system was rebuilt once already to remove exactly those tells; new
work should not reintroduce them.

**Key Characteristics:**
- Serif display type (Libre Caslon Text) carries hierarchy; Inter carries
  data and body copy.
- One accent color live at a time, switched per module via a `data-mood`
  scope — never two accents fighting on the same screen.
- Zero shadows. Depth comes from a four-step tonal surface ramp plus a
  hairline stroke.
- Every interactive control clears a 44px touch target and gets a themed
  focus ring, even where the visible control is smaller.

## Colors

A single dark, near-black ground with five module accents that rotate in
and out via a `data-mood` attribute — the palette is designed to show one
accent at a time, not to be used all at once.

### Primary
- **Deep Verdigris** (`#278276`): the brand's base accent — primary CTAs on
  Landing and Login, and the fallback accent for any chrome that sits
  outside a specific module's scope (install prompts, the notifications
  panel).

### Secondary — Module Accents (one active at a time)
- **Emerald** (`#10b981`): Expenses. Also drives the bar/donut chart series
  fill directly (`fill="var(--mood-accent)"`).
- **Burnt Terracotta** (`#a8471f`): Dog.
- **Signal Red** (`#ee1c25`): Car. As text (not icon fills), use the
  lightened `--mood-accent-text` variant — the raw hex falls under 4.5:1
  contrast on the surface ramp.
- **Apothecary Teal** (`#14b8a6`): Meds.
- **Dusty Violet** (`#a78bfa`): Body.

### Neutral — The Surface Ramp
- **Void** (`#0c0f10`): the lowest step — recessed wells inside a card,
  phone-mockup screens.
- **Ink** (`#111415`): the page background itself (also `brand-secondary`).
- **Slate** (`#191c1d`): one step up — every content card sits here.
- **Graphite** (`#373a3b`): the highest neutral — chips, secondary buttons,
  DataTables' toolbar buttons.

Body text runs at `rgba(255,255,255,0.75)` on Slate (~10:1 contrast);
labels at `rgba(255,255,255,0.5)` (~5.2:1) — both were raised from a
lower default this session after an audit found the original label opacity
sitting right at the WCAG AA boundary.

### Named Rules
**The One Accent Rule.** Exactly one module accent is visually active per
screen, scoped by `data-mood` on that route's layout wrapper. Chrome
outside any module scope (Landing, Login, install prompts) falls back to
Deep Verdigris, never a second competing hue.

**The No-Chip Rule.** An icon never sits inside a tinted, rounded-square
background. This was the single most recognizable "generated dashboard"
signature in the app's first draft and was removed everywhere; do not
reintroduce it.

## Typography

**Display Font:** Libre Caslon Text (with Georgia, serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)

**Character:** A serious, old-fashioned serif for anything that announces
itself (page titles, card totals, the landing hero) against a modern
grotesque for everything that needs to be scanned or compared (labels,
body copy, table data, form fields). The pairing is doing the "editorial
almanac" work by itself — restraint elsewhere lets it carry the personality.

### Hierarchy
- **Display-lg** (400, `clamp(2.5rem, 6vw, 3.5rem)`, 1.05): Landing hero
  headline only.
- **Display** (400, 2rem/32px, 1.1): page-level `<h1>` via `PageHeader`.
- **Display-sm** (400, 1.5rem/24px, 1.15): section titles (`Section`,
  `Modal` header), card-level headings.
- **Stat** (400, 2.25rem/36px, 1): the big numeral in every `StatCard` —
  the one place a number is allowed to be the largest thing on screen.
- **Body** (400, 0.875rem/14px, 1.5): running text, list rows, table cells.
- **Label** (500, 0.75rem/12px, 1.1, tracked 0.06em): tab labels and
  similar short UI text.
- **Micro** (500, 0.625rem/10px, 1, tracked 0.1em, uppercase): field
  labels, StatCard labels, eyebrows above a display heading.

### Named Rules
**The Numeral Rule.** Any value the user came to check at a glance — a
stat, a total, a big status number — renders in the display serif at the
`stat` size, never the body sans face. If it's the answer to "how much /
how many", it gets the serif treatment.

## Layout

Single-column content stacked with `flex flex-col gap-10` (40px) between
top-level sections — deliberately larger than a typical dashboard's
`gap-5`, because uniform tight spacing is what makes a screen read as a
data dump instead of a considered layout. Page content sits in a
`max-w-5xl` column with `px-4` (mobile) / `px-8` (`sm:`) side padding, `pt-10`
top / `pt-12` on `sm:`, and enough bottom padding to clear the fixed mobile
bottom-nav plus its safe-area inset.

Stat cards use a `grid grid-cols-2 sm:grid-cols-4` — two columns on phones,
four from tablet width up — and are the one place a uniform grid is
correct; content sections below them get a single focal element instead
of competing for attention.

Responsive breakpoints follow Tailwind defaults (`sm` at 640px); no custom
breakpoint scale.

## Elevation & Depth

No shadows anywhere on content surfaces — this is an explicit, code-level
rule (`.surface-card`'s own comment: "no blur and no shadow. Depth reads
from the ramp, not from a drop shadow"). Depth is conveyed entirely by the
four-step tonal surface ramp (Void → Ink → Slate → Graphite) plus a
1px hairline stroke at `rgba(255,255,255,0.06)` on cards and
`rgba(255,255,255,0.1)` on translucent chrome. The one exception: fixed
chrome overlays that sit above scrolling content (toasts, the due-reminder
host, the install prompt) may keep a `shadow-xl` — they're chrome floating
over the page, not a content surface competing with other content surfaces.

### Named Rules
**The Flat-Content Rule.** If it scrolls with the page, it has no shadow.
Shadows are reserved for fixed overlay chrome only.

## Shapes

Two radius steps, used consistently by role: **1rem/16px** for content
containers (cards, modal panels, the phone-mockup frame) and **0.5rem/8px**
(Tailwind's default `rounded-lg`) for controls — buttons, inputs, chips,
table action icons. Pills (`rounded-full`) appear only for genuinely
circular things: avatars, small status dots, the floating sprite
decorations. No sharp corners anywhere; no clipped/angled corners.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px), never the card radius.
- **Primary:** solid fill in the active module's accent
  (`bg-mood-accent`), white text, `px-4 py-2`, `font-semibold`. Hover drops
  opacity to ~90% rather than shifting color — the fill itself is the
  statement.
- **Icon-only:** transparent, `text-slate-500`, `p-1.5`–`p-2`. Hover adds a
  faint `bg-white/5` wash and shifts icon color to the module accent (or
  red for destructive actions). Every icon button also carries `.tap-target`
  (an invisible `::before` expanding the hit area to 44px) and the global
  `:focus-visible` ring — added this session after an audit found icon
  buttons sitting at ~28px.
- **Ghost/secondary:** `border border-white/10`, `text-slate-400`, same
  radius and padding as primary; hover shifts border and text to the
  module accent.

### Cards
- **Corner Style:** 1rem (16px).
- **Background:** Slate (`#191c1d`), one step up from the Ink page ground.
- **Border:** 1px hairline at `rgba(255,255,255,0.06)`.
- **Shadow:** none — see Elevation & Depth.
- **Internal Padding:** 1.25rem (20px), via a shared `Card` primitive every
  module composes rather than re-implementing.

### Inputs / Fields
- **Style:** `rounded-lg`, `border border-white/10`, `bg-black/20`,
  `px-3 py-2`, `text-sm`.
- **Label:** always a real `<label>` at the Micro size
  (`text-micro uppercase text-white/50`) tied via `htmlFor`/`id` — never
  placeholder-only labeling.
- **Focus:** border shifts to Deep Verdigris plus a soft
  `color-mix(..., 22%, transparent)` glow ring — the one input treatment
  that doesn't use the global button focus ring, since it needs to read as
  "editing" rather than "selected."

### Modals / Dialogs
- **Style:** rendered through a `Portal` into `document.body` (required for
  correct `position: fixed` behavior under any `backdrop-filter` ancestor),
  backdrop `bg-black/60 backdrop-blur-sm`, panel is `.glass` (translucent,
  blurred) at the card radius, `max-w-lg` (general forms) or `max-w-sm`
  (confirmations).
- **Motion:** backdrop fades in (`DUR.fast`); panel fades and scales from
  0.98→1 (`DUR.base`). No spring/bounce anywhere in the system — every
  motion value comes from `lib/motion.ts`'s shared `DUR`/`EASE`, and every
  call site checks `useReducedMotion()` first.
- **Header:** Display-sm title + a `.tap-target` close (X) icon button.

### Navigation
- **Sidebar (desktop):** left-rule indicator (`border-mood-accent`) on the
  active item rather than a filled pill background; inactive labels sit at
  the Body size, `rgba(255,255,255,0.5)`.
- **Bottom nav (mobile):** icon + Micro-size label stack; active state uses
  the lightened `--mood-accent-text` (not the raw module accent — the same
  contrast reasoning as Signal Red's text usage).
- **Tabs:** Label-size uppercase pills; active tab gets a solid Graphite
  background rather than an underline or color change.

### Data tables (DataGrid)
The one component in the system built on a library rather than from
primitives — DataTables.js, re-themed through CSS custom properties rather
than fighting its default markup (`.dt-theme` in `index.css`). Sort,
paginate, and CSV-export any of the four list-style modules' history data;
row actions render as real React content via DataTables' `slots` API,
including a live `SensitiveValue` blur on money/measurement columns.
Paging buttons, the search input, and the CSV button are all forced to a
44px minimum height — DataTables' own default sizing does not clear the
touch-target floor.

## Do's and Don'ts

### Do:
- **Do** put any "how much / how many" value in the Stat display size.
- **Do** scope every module screen with the correct `data-mood` so its one
  accent is live.
- **Do** give every icon-only button `.tap-target` plus a visible
  `:focus-visible` state.
- **Do** use the lightened `--mood-accent-text` for small persistent
  accent-colored text (eyebrows, active nav labels); reserve the raw
  `--mood-accent` for icon fills and hover-only states, where the 3:1
  non-text contrast threshold applies instead of 4.5:1.
- **Do** keep every animation value sourced from `lib/motion.ts` and
  guarded by `useReducedMotion()`.

### Don't:
- **Don't** put an icon inside a tinted, rounded-square background — The
  No-Chip Rule.
- **Don't** add a shadow to anything that scrolls with the page.
- **Don't** use a dashed border anywhere (`border-dashed` is banned outright
  — it read as an unfinished/placeholder state everywhere it appeared).
- **Don't** show two module accents active on the same screen.
- **Don't** use spring/bounce easing, or write a new duration/easing value
  outside `lib/motion.ts`.
- **Don't** adopt luxury/concierge copy register ("Stewardship", "Estate",
  "Concierge", "Vault") even though the visual system is dressed-up and
  premium — the copy stays plain and factual. This is a confirmed,
  deliberate product decision, not an oversight.

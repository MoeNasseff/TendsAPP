---
name: Fintech Noir
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#c4c5d9'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#8e90a2'
  outline-variant: '#434656'
  surface-tint: '#b8c3ff'
  primary: '#b8c3ff'
  on-primary: '#002388'
  primary-container: '#2e5bff'
  on-primary-container: '#efefff'
  inverse-primary: '#124af0'
  secondary: '#bec6e0'
  on-secondary: '#283044'
  secondary-container: '#3f465c'
  on-secondary-container: '#adb4ce'
  tertiary: '#c4c7c9'
  on-tertiary: '#2d3133'
  tertiary-container: '#6a6d6f'
  on-tertiary-container: '#eef0f2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#0035be'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is centered on "Fintech Luxury"—a philosophy that balances the precision of high-end accounting with the ethereal nature of artificial intelligence. The target audience includes high-net-worth entrepreneurs and modern finance teams who value speed, accuracy, and aesthetic prestige.

The style is a fusion of **Minimalism** and **Glassmorphism**. It utilizes expansive whitespace to reduce cognitive load while employing translucent, layered surfaces to represent the "transparency" of AI data extraction. The visual emotional response should be one of "effortless command"—a tool that feels expensive, intelligent, and private.

## Colors

The palette is anchored by **Deep Slate** (`#0F172A`) to establish a grounded, premium environment. **Electric Cobalt** (`#2E5BFF`) serves as the high-energy pulse of the system, used exclusively for primary actions, AI processing indicators, and critical data highlights. 

**Crisp White** is reserved for high-level information and text, while **Cool Gray** tones provide a hierarchy for secondary metadata. The default state is a dark mode that mimics high-end hardware interfaces, ensuring the "Electric Cobalt" pops with maximum luminance.

## Typography

This design system uses **Inter** for all primary interface elements, leveraging its tight apertures and neutral tone to convey technical efficiency. For data-heavy elements like invoice numbers, IBANs, and amounts, **JetBrains Mono** is introduced to provide a "technical audit" feel, reinforcing the precision of the AI scanning process.

Headlines use negative letter spacing to feel "compact" and premium. Body text maintains generous line height for maximum legibility against dark backgrounds.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strict 8px baseline. Content is organized into modular "Glass Cards" that float within the layout. 

On desktop, the interface uses a 12-column grid with wide margins to create a sense of exclusivity. On mobile, the grid collapses to 4 columns, and margins are reduced to maximize the "scan area" for the camera interface. Vertical rhythm is critical; use large `64px` or `80px` gaps between major sections to emphasize the minimalistic brand narrative.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and tonal layering rather than traditional shadows. 

1.  **Base Layer:** Solid Deep Slate (`#0F172A`).
2.  **Surface Layer:** Semi-transparent Slate (10% opacity) with a `24px` backdrop blur. This is used for main content cards.
3.  **Accent Layer:** Subtle 1px inner borders (white at 10% opacity) on glass cards to catch "light" and define edges.
4.  **Floating Elements:** Elements like primary buttons or "AI Active" states use a soft, diffuse Electric Cobalt glow (20% opacity, 40px blur) to appear as if they are emitting light rather than casting a shadow.

## Shapes

The shape language is "Sophisticated Softness." We use a **Rounded** (`0.5rem` / `8px`) base for standard inputs and small cards to maintain a professional structure. Larger layout containers and the primary "Scan" button utilize the `rounded-xl` (`1.5rem` / `24px`) setting to feel comfortable and modern. Avoid sharp corners entirely to distinguish the app from legacy enterprise software.

## Components

*   **Glass Cards:** The core container. Background: `rgba(255, 255, 255, 0.03)`. Blur: `20px`. Border: `1px solid rgba(255, 255, 255, 0.1)`.
*   **Primary Action Button:** Solid Electric Cobalt background. High-contrast white text. No shadow, but a subtle "inner glow" on hover.
*   **AI Scan Chips:** Pill-shaped with a pulse animation. Uses a Gradient: `Linear(Electric Cobalt to Transparent)`.
*   **Input Fields:** Ghost style. No background fill, only a bottom border (2px) that illuminates to Electric Cobalt when focused. Labels use `label-sm` (monospaced).
*   **Data Lists:** Rows separated by 1px faint slate lines. Monetary values are right-aligned and set in `JetBrains Mono` for tabular alignment.
*   **Scanning HUD:** A camera overlay with corner brackets that "snap" and glow when the AI detects an invoice edge.
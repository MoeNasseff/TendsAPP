import type { Config } from 'tailwindcss'

export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // rgb(channels / <alpha-value>) rather than a bare var(): Tailwind can
        // only build opacity modifiers (bg-brand-primary/10, bg-mood-accent/20)
        // when it can substitute the alpha itself. With a bare var() those
        // classes are silently dropped from the output. Channel variables are
        // defined in index.css and styles/moods.css.
        brand: {
          primary: 'rgb(var(--brand-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary-rgb) / <alpha-value>)',
          accent: 'rgb(var(--brand-accent-rgb) / <alpha-value>)',
          'on-primary': 'rgb(var(--brand-on-primary-rgb) / <alpha-value>)',
        },
        mood: {
          accent: 'rgb(var(--mood-accent-rgb) / <alpha-value>)',
          'accent-2': 'rgb(var(--mood-accent-2-rgb) / <alpha-value>)',
          surface: 'rgb(var(--mood-surface-rgb) / <alpha-value>)',
          border: 'rgb(var(--mood-border-rgb) / <alpha-value>)',
        },
        // Elevation ramp. Channels live in index.css.
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          lowest: 'rgb(var(--surface-lowest-rgb) / <alpha-value>)',
          low: 'rgb(var(--surface-low-rgb) / <alpha-value>)',
          bright: 'rgb(var(--surface-bright-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Libre Caslon Text"', 'Georgia', 'serif'],
      },
      // Editorial scale: a serif display range for headings and stat numerals,
      // plus tracked uppercase micro sizes for labels. Extends the defaults
      // rather than replacing them, so text-xs/text-sm still exist.
      fontSize: {
        micro: ['0.625rem', { lineHeight: '1rem', letterSpacing: '0.1em' }],
        label: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.06em' }],
        'display-sm': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        display: ['2rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.5rem, 6vw, 3.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        stat: ['2.25rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      transitionDuration: {
        fast: '200ms',
        base: '300ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config

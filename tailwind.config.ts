import type { Config } from 'tailwindcss'

export default {
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
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config

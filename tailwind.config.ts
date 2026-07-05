import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          accent: 'var(--brand-accent)',
          'on-primary': 'var(--brand-on-primary)',
        },
        mood: {
          accent: 'var(--mood-accent)',
          'accent-2': 'var(--mood-accent-2)',
          surface: 'var(--mood-surface)',
          border: 'var(--mood-border)',
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, WifiOff } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Card } from '../components/Card'
import { useBrand } from '../hooks/useBrand'
import { onInstallAvailabilityChange, promptInstall } from '../lib/pwa'
import { NAV_ITEMS } from '../components/nav-items'
import { fadeUp } from '../lib/motion'

export function Landing() {
  const brand = useBrand()
  const reduce = useReducedMotion()
  const [installAvailable, setInstallAvailable] = useState(false)

  useEffect(() => {
    const unsubscribe = onInstallAvailabilityChange(setInstallAvailable)
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <main className="min-h-svh bg-brand-secondary text-slate-200">
      <nav className="glass sticky top-0 z-20 flex items-center justify-between border-b px-4 py-4 sm:px-8">
        <img src={brand.logo.src} alt={brand.logo.alt} className="h-7 w-auto" />
        <Link
          to="/login"
          className="rounded-lg border border-white/10 px-4 py-1.5 text-sm text-slate-300 transition-colors duration-fast ease-out-expo hover:border-mood-accent hover:text-mood-accent"
        >
          Sign in
        </Link>
      </nav>

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-12 px-4 pb-20 pt-16 sm:px-8 sm:pt-24 lg:flex-row lg:items-center lg:gap-16">
        <motion.div
          {...(reduce ? {} : fadeUp)}
          className="flex flex-1 flex-col items-start gap-6 text-left"
        >
          <h1 className="font-display text-display-lg text-white">{brand.appName}</h1>
          <p className="max-w-md text-lg text-white/50">{brand.tagline}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-mood-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity duration-fast ease-out-expo hover:opacity-90"
            >
              Get started
            </Link>
            {installAvailable && (
              <button
                type="button"
                onClick={() => promptInstall()}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors duration-fast ease-out-expo hover:border-mood-accent hover:text-mood-accent"
              >
                <Download className="h-4 w-4" />
                Install app
              </button>
            )}
          </div>
        </motion.div>

        <div className="flex flex-1 justify-center">
          <PhoneMockup />
        </div>
      </section>

      <motion.section
        initial={reduce ? undefined : fadeUp.initial}
        whileInView={reduce ? undefined : fadeUp.animate}
        viewport={{ once: true }}
        transition={fadeUp.transition}
        className="mx-auto max-w-5xl px-4 pb-20 sm:px-8"
      >
        <div className="mb-6 flex flex-col gap-2">
          <span className="text-micro uppercase text-mood-accent-safe">Everything in one place</span>
          <h2 className="font-display text-display-sm text-white">Five things worth keeping track of</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {NAV_ITEMS.map((item) => (
            <div key={item.to} data-mood={item.mood}>
              <Card className="flex flex-col items-center gap-3 py-8 text-center">
                <item.icon className="h-6 w-6 text-mood-accent" aria-hidden="true" />
                <span className="text-sm font-medium text-white">{item.label}</span>
              </Card>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={reduce ? undefined : fadeUp.initial}
        whileInView={reduce ? undefined : fadeUp.animate}
        viewport={{ once: true }}
        transition={fadeUp.transition}
        className="mx-auto max-w-5xl px-4 pb-20 sm:px-8"
      >
        <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
          <WifiOff className="h-6 w-6 shrink-0 text-mood-accent" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-display-sm text-white">Works offline, installs like an app</h3>
            <p className="text-sm text-white/50">
              {brand.appName} runs as an installable PWA — add it to your home screen and it keeps working
              without a connection.
            </p>
          </div>
        </Card>
      </motion.section>

      <footer className="border-t border-white/10 px-4 py-10 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-2">
          <img src={brand.logo.src} alt={brand.logo.alt} className="h-6 w-auto" />
          <p className="text-sm text-white/50">{brand.tagline}</p>
          <Link to="/login" className="mt-2 text-xs text-slate-400 hover:text-mood-accent">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  )
}

const MOCK_BARS = [40, 65, 30, 80, 55, 70, 45]

/**
 * Native CSS phone frame — no component kit, no remote images, no stock
 * screenshots. An abstract preview built from the same surface-ramp tokens
 * as the real app (stat cards + a bar-chart silhouette), standing in until
 * real captured screens land at public/brand/screens/.
 */
function PhoneMockup() {
  return (
    <div className="aspect-[9/19.5] w-56 rounded-[2.5rem] border border-white/10 bg-surface-lowest p-2 sm:w-64">
      <div className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-[2rem] bg-surface-low p-4">
        <div className="flex items-center justify-between">
          <div className="h-2 w-2 rounded-full bg-mood-accent" />
          <div className="h-1.5 w-10 rounded-full bg-white/10" />
        </div>

        <div className="mt-1 flex flex-col gap-1.5">
          <div className="h-1.5 w-10 rounded-full bg-mood-accent/60" />
          <div className="h-3 w-24 rounded-sm bg-white/80" />
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-white/5 bg-surface-bright/40 p-2">
              <div className="h-1 w-6 rounded-full bg-white/20" />
              <div className="h-2.5 w-10 rounded-sm bg-white/70" />
            </div>
          ))}
        </div>

        <div className="mt-1 flex-1 rounded-lg border border-white/5 bg-surface-bright/30 p-3">
          <div className="h-1.5 w-16 rounded-full bg-white/20" />
          <div className="mt-3 flex h-16 items-end gap-1.5">
            {MOCK_BARS.map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-mood-accent/50" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

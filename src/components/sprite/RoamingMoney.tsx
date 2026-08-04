import { useEffect, useState } from 'react'
import { SpriteAnimator } from './SpriteAnimator'
import { SpriteField } from './SpriteField'
import { MONEY } from '../../lib/sprite/animations'
import { prefersReducedMotion, randomBetween, randomOf } from '../../lib/sprite/spriteUtils'
import type { Clip } from '../../lib/sprite/animationTypes'

interface Bill {
  id: number
  clip: Clip
  /** Percentages of the field, so spawns stay sensible at any window size. */
  left: number
  top: number
  scale: number
  driftX: number
  driftY: number
  durationMs: number
}

/** Cap from the brief. More than six reads as clutter rather than flavour. */
const MAX_BILLS = 6

let nextId = 0

function spawn(): Bill {
  return {
    id: nextId++,
    clip: randomOf([MONEY.float, MONEY.spin, MONEY.drift]),
    // Spawns across the full width, not just the margins. The field cannot take
    // pointer events, so a bill passing over a card or an input is harmless.
    left: randomBetween(2, 88),
    top: randomBetween(10, 92),
    scale: randomBetween(0.3, 0.55),
    driftX: randomBetween(-70, 70),
    driftY: randomBetween(-260, -120), // always upward, like paper on a draught
    durationMs: randomBetween(7000, 13000),
  }
}

/**
 * The Expenses tab's drifting banknotes: they appear anywhere on the page,
 * rise, and fade out, replacing themselves at irregular intervals.
 */
export function RoamingMoney() {
  const [bills, setBills] = useState<Bill[]>([])

  useEffect(() => {
    if (prefersReducedMotion()) return
    let timer: number
    const tick = () => {
      setBills((current) => (current.length >= MAX_BILLS ? current : [...current, spawn()]))
      timer = window.setTimeout(tick, randomBetween(1200, 3000))
    }
    timer = window.setTimeout(tick, randomBetween(300, 1200))
    return () => clearTimeout(timer)
  }, [])

  return (
    <SpriteField>
      {bills.map((bill) => (
        <FloatingBill
          key={bill.id}
          bill={bill}
          onDone={() => setBills((current) => current.filter((b) => b.id !== bill.id))}
        />
      ))}
    </SpriteField>
  )
}

function FloatingBill({ bill, onDone }: { bill: Bill; onDone: () => void }) {
  const [drifted, setDrifted] = useState(false)

  useEffect(() => {
    // Applied on the next frame so the element paints at its start position
    // first — otherwise the transition has nothing to animate from.
    const raf = requestAnimationFrame(() => setDrifted(true))
    const done = window.setTimeout(onDone, bill.durationMs)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
  }, [bill.durationMs, onDone])

  return (
    <div
      className="absolute will-change-transform"
      style={{
        left: `${bill.left}%`,
        top: `${bill.top}%`,
        // transform and opacity only: both are compositor properties, so any
        // number of bills drifting at once costs no main-thread layout work.
        transform: drifted
          ? `translate3d(${bill.driftX}px, ${bill.driftY}px, 0)`
          : 'translate3d(0,0,0)',
        opacity: drifted ? 0 : 0.85,
        transition: `transform ${bill.durationMs}ms linear, opacity ${bill.durationMs}ms ease-in`,
      }}
    >
      <SpriteAnimator image={bill.clip} scale={bill.scale} />
    </div>
  )
}

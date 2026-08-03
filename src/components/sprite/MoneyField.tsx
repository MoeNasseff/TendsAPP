import { useEffect, useState } from 'react'
import { SpriteAnimator } from './SpriteAnimator'
import { MONEY } from '../../lib/sprite/animations'
import { prefersReducedMotion, randomBetween, randomOf } from '../../lib/sprite/spriteUtils'
import type { Clip } from '../../lib/sprite/animationTypes'

interface Bill {
  id: number
  clip: Clip
  /** Percentages, so spawn positions stay correct at any container width. */
  left: number
  top: number
  scale: number
  driftX: number
  driftY: number
  durationMs: number
}

/** Hard cap from the brief — more than this reads as clutter, not flavour. */
const MAX_BILLS = 6

let nextId = 0

function spawn(): Bill {
  return {
    id: nextId++,
    clip: randomOf([MONEY.float, MONEY.spin, MONEY.drift]),
    // Kept away from the horizontal centre band, where cards and figures sit.
    left: randomOf([randomBetween(0, 18), randomBetween(78, 94)]),
    top: randomBetween(5, 80),
    scale: randomBetween(0.28, 0.5),
    driftX: randomBetween(-40, 40),
    driftY: randomBetween(-140, -60), // always upward, like paper caught in air
    durationMs: randomBetween(9000, 16000),
  }
}

/**
 * Bills that drift up through the background and fade out, replacing themselves
 * at irregular intervals.
 *
 * Sits behind the content in the stacking order and never takes pointer events,
 * so it cannot cover or block anything interactive. Movement and fade are CSS
 * transitions on transform and opacity — both compositor-only properties — so
 * the drifting costs no main-thread work no matter how many are on screen.
 */
export function MoneyField({ className = '' }: { className?: string }) {
  const [bills, setBills] = useState<Bill[]>([])

  useEffect(() => {
    if (prefersReducedMotion()) return

    let timer: number
    const tick = () => {
      setBills((current) => (current.length >= MAX_BILLS ? current : [...current, spawn()]))
      timer = window.setTimeout(tick, randomBetween(2500, 6000))
    }
    timer = window.setTimeout(tick, randomBetween(500, 2000))
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {bills.map((bill) => (
        <FloatingBill
          key={bill.id}
          bill={bill}
          onDone={() => setBills((current) => current.filter((b) => b.id !== bill.id))}
        />
      ))}
    </div>
  )
}

function FloatingBill({ bill, onDone }: { bill: Bill; onDone: () => void }) {
  const [drifted, setDrifted] = useState(false)

  useEffect(() => {
    // Next frame, so the element paints at its start position before the
    // transition target is applied — otherwise there is nothing to animate from.
    const raf = requestAnimationFrame(() => setDrifted(true))
    const done = window.setTimeout(onDone, bill.durationMs)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
  }, [bill.durationMs, onDone])

  return (
    <div
      className="absolute"
      style={{
        left: `${bill.left}%`,
        top: `${bill.top}%`,
        transform: drifted
          ? `translate3d(${bill.driftX}px, ${bill.driftY}px, 0)`
          : 'translate3d(0,0,0)',
        opacity: drifted ? 0 : 0.75,
        transition: `transform ${bill.durationMs}ms linear, opacity ${bill.durationMs}ms ease-in`,
      }}
    >
      <SpriteAnimator image={bill.clip} scale={bill.scale} />
    </div>
  )
}

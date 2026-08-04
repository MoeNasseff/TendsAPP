import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SpriteField } from './SpriteField'
import { prefersReducedMotion, randomBetween } from '../../lib/sprite/spriteUtils'

export interface RoamState {
  /** True while travelling between two points, false while resting. */
  moving: boolean
  /** 1 when heading right, -1 when heading left. */
  facing: 1 | -1
}

interface SpriteRoamerProps {
  children: (state: RoamState) => ReactNode
  /** Travel rate in px per ms. 0.06 is an unhurried walk. */
  speed?: number
  pauseMinMs?: number
  pauseMaxMs?: number
  /** 'x' keeps a subject on one line — used by the car, which cannot turn. */
  axis?: 'both' | 'x'
  opacity?: number
}

/**
 * Wanders a sprite around the page, resting between legs.
 *
 * The position is animated by writing `translate3d` to the node on each frame,
 * never through React and never via `left`/`top`. That keeps the whole
 * traversal on the compositor: no layout, no reflow of the page underneath, and
 * no rerenders of the surrounding tree while it moves.
 *
 * React state changes only when a leg starts or ends — a few times a minute —
 * so the render prop can swap clips (walk while moving, idle while resting)
 * without that costing anything per frame.
 */
export function SpriteRoamer({
  children,
  speed = 0.06,
  pauseMinMs = 1800,
  pauseMaxMs = 5000,
  axis = 'both',
  opacity = 1,
}: SpriteRoamerProps) {
  const [state, setState] = useState<RoamState>({ moving: false, facing: 1 })
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const spriteRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const field = fieldRef.current
    const node = spriteRef.current
    if (!field || !node) return

    let raf = 0
    let timer = 0
    let x = 0
    let y = 0

    // Recomputed per leg rather than cached, so resizing the window or rotating
    // the device cannot strand a sprite outside the visible area.
    const limits = () => ({
      w: Math.max(0, field.clientWidth - node.offsetWidth),
      h: Math.max(0, field.clientHeight - node.offsetHeight),
    })

    const place = () => {
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    const start = limits()
    x = randomBetween(0, start.w)
    y = axis === 'x' ? randomBetween(0, start.h) : randomBetween(0, start.h)
    place()

    const rest = () => {
      setState((s) => ({ ...s, moving: false }))
      timer = window.setTimeout(travel, randomBetween(pauseMinMs, pauseMaxMs))
    }

    const travel = () => {
      const { w, h } = limits()
      const targetX = randomBetween(0, w)
      const targetY = axis === 'x' ? y : randomBetween(0, h)
      const dx = targetX - x
      const dy = targetY - y
      const distance = Math.hypot(dx, dy)
      if (distance < 2) return rest()

      const fromX = x
      const fromY = y
      const duration = distance / speed
      const startedAt = performance.now()
      setState({ moving: true, facing: dx >= 0 ? 1 : -1 })

      const step = (now: number) => {
        const t = Math.min(1, (now - startedAt) / duration)
        x = fromX + dx * t
        y = fromY + dy * t
        place()
        if (t < 1) {
          raf = requestAnimationFrame(step)
        } else {
          rest()
        }
      }
      raf = requestAnimationFrame(step)
    }

    timer = window.setTimeout(travel, randomBetween(400, 1800))
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [speed, pauseMinMs, pauseMaxMs, axis])

  return (
    <SpriteField>
      <div ref={fieldRef} className="absolute inset-0">
        <div ref={spriteRef} className="absolute left-0 top-0 will-change-transform" style={{ opacity }}>
          {/* Flip lives on its own wrapper so it composes with the animator's
              own scale transform instead of overwriting it. */}
          <div style={{ transform: `scaleX(${state.facing})` }}>{children(state)}</div>
        </div>
      </div>
    </SpriteField>
  )
}

import { useEffect, useRef, useState } from 'react'
import { SpriteAnimator } from './SpriteAnimator'
import { DOG, DOG_IDLE_POSES } from '../../lib/sprite/animations'
import { prefersReducedMotion, randomBetween, randomOf } from '../../lib/sprite/spriteUtils'
import type { Clip } from '../../lib/sprite/animationTypes'

/** Weighted pick, so stillness is commoner than jumping about. */
function pickPose() {
  const pool = DOG_IDLE_POSES.flatMap((p) => Array<typeof p>(p.weight).fill(p))
  return randomOf(pool)
}

/**
 * A dog that loafs around: it holds a pose for a while, picks another, and now
 * and then walks the full width of its container before settling again.
 *
 * State changes here are deliberate and rare — one every several seconds when a
 * pose ends — as opposed to per-frame, which the engine handles outside React.
 */
export function IdleDog({ scale = 0.5, className = '' }: { scale?: number; className?: string }) {
  const [pose, setPose] = useState<Clip>(DOG.idle)
  const [walking, setWalking] = useState(false)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const dogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return

    let timer: number
    let walkFrame = 0

    const settle = () => {
      const next = pickPose()
      setWalking(false)
      setPose(next.clip)
      timer = window.setTimeout(
        // Roughly one in four settles becomes a walk across instead.
        () => (Math.random() < 0.25 ? walkAcross() : settle()),
        randomBetween(next.ms[0], next.ms[1]),
      )
    }

    const walkAcross = () => {
      const track = trackRef.current
      const dog = dogRef.current
      if (!track || !dog) return settle()

      setWalking(true)
      setPose(DOG.walk)

      const distance = track.clientWidth + dog.clientWidth
      const pxPerMs = 0.045 // slow amble, tuned to the 10fps walk cycle
      const startedAt = performance.now()

      const step = (now: number) => {
        const travelled = (now - startedAt) * pxPerMs
        // translate3d rather than left: no layout, no paint invalidation of the
        // page, and the whole traversal stays on the compositor.
        dog.style.transform = `translate3d(${travelled - dog.clientWidth}px,0,0)`
        if (travelled < distance) {
          walkFrame = requestAnimationFrame(step)
        } else {
          dog.style.transform = ''
          settle()
        }
      }
      walkFrame = requestAnimationFrame(step)
    }

    timer = window.setTimeout(settle, randomBetween(1000, 3000))
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(walkFrame)
    }
  }, [])

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className={`pointer-events-none relative overflow-hidden ${className}`}
    >
      <div ref={dogRef} className={walking ? 'absolute bottom-0 left-0' : 'absolute bottom-0 right-4'}>
        <SpriteAnimator
          // Remounting on pose change resets the clock, so non-looping poses
          // such as jump play from their first frame every time.
          key={`${pose.sheet}-${pose.from ?? 0}`}
          image={pose}
          scale={scale}
        />
      </div>
    </div>
  )
}

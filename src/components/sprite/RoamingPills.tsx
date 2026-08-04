import { useEffect, useState } from 'react'
import { SpriteAnimator } from './SpriteAnimator'
import { SpriteField } from './SpriteField'
import { PILLS } from '../../lib/sprite/animations'
import { prefersReducedMotion, randomBetween } from '../../lib/sprite/spriteUtils'

type Phase = 'standing' | 'spilling' | 'resting' | 'fading'

function randomSpot() {
  return { left: randomBetween(4, 70), top: randomBetween(15, 80) }
}

/**
 * The Meds tab's pill bottle: it stands somewhere on the page, tips over and
 * spills, the pills lie there a moment, then everything fades and the bottle
 * reappears somewhere else.
 *
 * The bottle does not slide around like the dog or the car — a bottle skating
 * across the screen would look wrong — so it relocates while invisible between
 * cycles instead.
 */
export function RoamingPills({ scale = 0.5 }: { scale?: number }) {
  const [phase, setPhase] = useState<Phase>('standing')
  const [spot, setSpot] = useState(randomSpot)
  const [runId, setRunId] = useState(0)

  // Stands for a while before tipping, so it stays a surprise. Short enough to
  // be seen within a normal visit to the tab.
  useEffect(() => {
    if (phase !== 'standing' || prefersReducedMotion()) return
    const timer = window.setTimeout(() => setPhase('spilling'), randomBetween(5000, 11000))
    return () => clearTimeout(timer)
  }, [phase, runId])

  useEffect(() => {
    if (phase !== 'resting') return
    const timer = window.setTimeout(() => setPhase('fading'), randomBetween(2500, 4500))
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'fading') return
    const timer = window.setTimeout(() => {
      // Move only once fully faded, so the jump is never seen.
      setSpot(randomSpot())
      setRunId((n) => n + 1)
      setPhase('standing')
    }, 1100)
    return () => clearTimeout(timer)
  }, [phase])

  return (
    <SpriteField>
      <div
        className="absolute"
        style={{
          left: `${spot.left}%`,
          top: `${spot.top}%`,
          opacity: phase === 'fading' ? 0 : 1,
          transition: 'opacity 1100ms ease-out',
        }}
      >
        <SpriteAnimator
          // Keyed on the cycle and on standing-vs-spilling. The standing clip is
          // a single frame and so completes immediately; without a remount at
          // the transition the engine would still hold it finished and the
          // spill would never start. Resting and fading share the spill's key so
          // it holds on its settled last frame rather than restarting.
          key={`${runId}-${phase === 'standing' ? 'idle' : 'spill'}`}
          image={phase === 'standing' ? PILLS.bottleStanding : PILLS.spill}
          scale={scale}
          onFinished={phase === 'spilling' ? () => setPhase('resting') : undefined}
        />
      </div>
    </SpriteField>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { SpriteAnimator } from './SpriteAnimator'
import { PILLS } from '../../lib/sprite/animations'
import { prefersReducedMotion, randomBetween } from '../../lib/sprite/spriteUtils'

type Phase = 'waiting' | 'spilling' | 'resting' | 'fading'

/**
 * A pill bottle that stands quietly, tips over at random, spills, rests, then
 * fades away and resets.
 *
 * The spill itself is one non-looping clip driven by the engine; this component
 * only sequences the phases around it, so it rerenders about four times per
 * cycle rather than per frame. `onFinished` is what advances it, which keeps the
 * timing tied to the actual last frame instead of a duration guessed here.
 */
export function PillSpill({ scale = 0.55, className = '' }: { scale?: number; className?: string }) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [runId, setRunId] = useState(0)

  // Idle stretch before tipping over, so it is a surprise rather than a loop.
  useEffect(() => {
    if (phase !== 'waiting' || prefersReducedMotion()) return
    const timer = window.setTimeout(() => setPhase('spilling'), randomBetween(12000, 30000))
    return () => clearTimeout(timer)
  }, [phase, runId])

  // Let the spilled pills sit before clearing them.
  useEffect(() => {
    if (phase !== 'resting') return
    const timer = window.setTimeout(() => setPhase('fading'), randomBetween(3000, 6000))
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'fading') return
    const timer = window.setTimeout(() => {
      setRunId((n) => n + 1)
      setPhase('waiting')
    }, 1200)
    return () => clearTimeout(timer)
  }, [phase])

  const onSpillFinished = useCallback(() => setPhase('resting'), [])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 1200ms ease-out',
      }}
    >
      <SpriteAnimator
        // Keyed on the cycle *and* on standing-vs-spilling. The standing clip
        // is a single frame, so it completes immediately; without a remount at
        // the transition the engine would still consider the clip finished and
        // the spill would never start. Resting and fading share the spill's key
        // so it holds on its settled last frame instead of restarting.
        key={`${runId}-${phase === 'waiting' ? 'idle' : 'spill'}`}
        image={phase === 'waiting' ? PILLS.bottleStanding : PILLS.spill}
        scale={scale}
        onFinished={phase === 'spilling' ? onSpillFinished : undefined}
      />
    </div>
  )
}

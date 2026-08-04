import { useEffect, useState } from 'react'
import { SpriteAnimator } from './SpriteAnimator'
import { SpriteRoamer } from './SpriteRoamer'
import { DOG, DOG_IDLE_POSES } from '../../lib/sprite/animations'
import { randomBetween, randomOf } from '../../lib/sprite/spriteUtils'
import type { Clip } from '../../lib/sprite/animationTypes'

/** Weighted pick, biased towards calm poses over acrobatics. */
function pickPose(): Clip {
  const pool = DOG_IDLE_POSES.flatMap((p) => Array<(typeof p)['clip']>(p.weight).fill(p.clip))
  return randomOf(pool)
}

/**
 * The Dog tab's companion: walks around the page, stops, does something doggish,
 * then wanders off again.
 */
export function RoamingDog({ scale = 0.42 }: { scale?: number }) {
  return (
    <SpriteRoamer speed={0.055} pauseMinMs={2500} pauseMaxMs={6000}>
      {({ moving }) => <DogSprite moving={moving} scale={scale} />}
    </SpriteRoamer>
  )
}

function DogSprite({ moving, scale }: { moving: boolean; scale: number }) {
  const [pose, setPose] = useState<Clip>(DOG.idle)

  // A fresh pose each time it settles, so consecutive rests are not identical.
  // Poses also rotate during a long rest rather than looping one clip forever.
  useEffect(() => {
    if (moving) return
    setPose(pickPose())
    const timer = window.setInterval(() => setPose(pickPose()), randomBetween(4000, 8000))
    return () => clearInterval(timer)
  }, [moving])

  // Annotated, since `satisfies` gives each entry in DOG a narrow literal type
  // and only some of them carry a `from`.
  const clip: Clip = moving ? DOG.walk : pose
  return (
    <SpriteAnimator
      // Remounting on clip change restarts the clock, so one-shot poses such as
      // jump play from their first frame instead of resuming mid-air.
      key={`${clip.sheet}-${clip.from ?? 0}`}
      image={clip}
      scale={scale}
    />
  )
}

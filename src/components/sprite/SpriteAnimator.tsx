import { useMemo } from 'react'
import { useSpriteAnimation } from '../../hooks/useSpriteAnimation'
import type { Clip, SpriteAnimatorProps } from '../../lib/sprite/animationTypes'

/**
 * Plays one sprite strip.
 *
 * Adding a new animation is only ever:
 *
 *   <SpriteAnimator image="dog-walk" fps={12} />
 *
 * Everything else — frame size, frame count, grid layout — comes from the
 * manifest that scripts/gen-sprites.ts writes, so nothing about the art is
 * repeated here or hardcoded at a call site.
 *
 * The element is purely decorative: `aria-hidden` keeps it out of the
 * accessibility tree, and `pointer-events: none` guarantees it can never
 * swallow a click or interfere with keyboard focus, however it is positioned.
 */
export function SpriteAnimator({
  image,
  frames,
  fps,
  loop,
  autoplay,
  reverse,
  scale = 1,
  speed,
  direction,
  pauseWhenHidden,
  pauseWhenOffscreen,
  onFinished,
  className,
  style,
}: SpriteAnimatorProps) {
  // `frames` narrows the clip to the first N frames when given. It exists for
  // call sites that want a subset without declaring a named clip.
  const clip: string | Clip = useMemo(() => {
    if (frames === undefined) return image
    const base: Clip = typeof image === 'string' ? { sheet: image, fps: fps ?? 12 } : image
    const start = base.from ?? 0
    return { ...base, from: start, to: start + frames - 1 }
  }, [image, frames, fps])

  const { ref, meta } = useSpriteAnimation({
    image: clip as SpriteAnimatorProps['image'],
    fps,
    loop,
    autoplay,
    speed,
    // `reverse` is sugar for the equivalent direction, and loses to an explicit
    // `direction` so the two cannot contradict each other.
    direction: direction ?? (reverse ? 'reverse' : undefined),
    pauseWhenHidden,
    pauseWhenOffscreen,
    onFinished,
  })

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        // translate3d promotes the element to its own compositor layer, so
        // scaling and any parent-driven movement stay off the main thread.
        transform: `translate3d(0,0,0) scale(${scale})`,
        // Subjects are bottom-aligned in their cells, so scaling from the
        // bottom keeps them planted instead of drifting off their ground line.
        transformOrigin: 'bottom center',
        pointerEvents: 'none',
        // Exactly one cell, so stepping background-position shows exactly one
        // frame. Note the layout box stays the unscaled cell size — `scale` is
        // a transform and does not affect layout, which is what these
        // decorative, absolutely-positioned uses want.
        width: meta.frameWidth,
        height: meta.frameHeight,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  )
}
